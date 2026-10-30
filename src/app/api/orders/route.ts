import { getSession } from '@/lib/auth'
import { getUser } from '@/lib/db'
import { createOrder, getOrders, OrderError, type NewOrderInput } from '@/lib/orders'
import { str } from '@/lib/validate'
import { parseAddress } from '@/lib/addresses'
import { getActiveFlashSale } from '@/lib/engagement'
import { broadcast } from '@/lib/live'
import { getDb } from '@/lib/db'
import { chargeOrder, normalizeCpf, paymentsEnabled, PaymentError, type PaymentInfo } from '@/lib/payments'

const PAYMENT_METHODS = ['pix', 'credit_card', 'boleto'] as const
const SHIPPING_OPTIONS = ['economico', 'expresso'] as const

export async function GET() {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  return Response.json(await getOrders(session.user.id))
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const body = (await request.json().catch(() => null)) as Record<string, any> | null
  const bad = (message: string) => Response.json({ error: 'INVALID', message }, { status: 400 })
  if (!body) return bad('Pedido inválido')

  const paymentMethod = PAYMENT_METHODS.find(m => m === body.paymentMethod)
  if (!paymentMethod) return bad('Forma de pagamento inválida')
  const shippingOption = SHIPPING_OPTIONS.find(o => o === body.shippingOption) ?? 'economico'

  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 50) return bad('Carrinho inválido')
  const items: NewOrderInput['items'] = []
  for (const i of body.items) {
    const productId = str(i?.productId, 64)
    const quantity = Number(i?.quantity)
    if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) return bad('Item inválido')
    const variants =
      i.variants && typeof i.variants === 'object'
        ? Object.fromEntries(
            Object.entries(i.variants)
              .filter(([k, v]) => typeof k === 'string' && typeof v === 'string')
              .slice(0, 10)
          ) as Record<string, string>
        : undefined
    items.push({ productId, quantity, variants })
  }

  // Recipient defaults to the account holder
  const profile = await getUser(session.user.id)
  const address = parseAddress(body.address ?? {}, {
    name: profile?.user.name ?? session.user.name,
    phone: (session.user as { phone?: string | null }).phone ?? '',
  })
  if (!address) return bad('Endereço incompleto')

  // Asaas needs the buyer's CPF; checked before the order takes any stock
  let taxId: string | null = null
  if (paymentsEnabled()) {
    taxId = body.taxId === undefined ? null : normalizeCpf(body.taxId)
    if (body.taxId !== undefined && !taxId) return Response.json({ error: 'TAX_ID', message: 'CPF inválido' }, { status: 400 })
    if (!taxId) {
      const saved = await getDb().prepare('SELECT tax_id FROM users WHERE id = ?').bind(session.user.id).first<string | null>('tax_id')
      if (!saved) return Response.json({ error: 'TAX_ID', message: 'Informe seu CPF para pagar' }, { status: 400 })
    }
  }

  try {
    const order = await createOrder(session.user.id, {
      items,
      paymentMethod,
      couponCode: str(body.couponCode, 32) ?? undefined,
      expectedTotalCents: Number.isInteger(body.expectedTotalCents) ? body.expectedTotalCents : undefined,
      auctionId: str(body.auctionId, 64) ?? undefined,
      shippingOption,
      address,
    }, { notifySellers: !paymentsEnabled() })
    for (const streamId of order.flashStreamIds) {
      broadcast(streamId, { t: 'flash', flashSale: await getActiveFlashSale(streamId) })
    }
    // The order stands even if the charge fails: the buyer can pay later from "Meus pedidos"
    let payment: PaymentInfo | null = null
    let paymentError: string | undefined
    if (paymentsEnabled()) {
      try {
        payment = await chargeOrder(session.user.id, order.id, { taxId })
      } catch (e) {
        if (!(e instanceof PaymentError)) throw e
        paymentError = e.message
      }
    }
    return Response.json({ id: order.id, total: order.total, payment, paymentError }, { status: 201 })
  } catch (e) {
    if (e instanceof OrderError) {
      return Response.json({ error: e.code, message: e.message }, { status: e.code === 'OUT_OF_STOCK' || e.code === 'PRICE_CHANGED' ? 409 : 400 })
    }
    throw e
  }
}
