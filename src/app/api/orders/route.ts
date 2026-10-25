import { getSession } from '@/lib/auth'
import { getUser } from '@/lib/db'
import { createOrder, getOrders, OrderError, type NewOrderInput } from '@/lib/orders'
import { str } from '@/lib/validate'

const PAYMENT_METHODS = ['pix', 'credit_card', 'boleto'] as const

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

  const a = body.address ?? {}
  const zipCode = str(a.zipCode, 9)?.replace(/\D/g, '') ?? ''
  const street = str(a.street)
  const number = str(a.number, 20)
  const neighborhood = str(a.neighborhood, 100)
  const city = str(a.city, 100)
  const state = str(a.state, 2)?.toUpperCase()
  if (zipCode.length !== 8 || !street || !number || !neighborhood || !city || !state) return bad('Endereço incompleto')

  // Recipient defaults to the account holder
  const profile = await getUser(session.user.id)
  const phone = (session.user as { phone?: string | null }).phone ?? ''

  try {
    const order = await createOrder(session.user.id, {
      items,
      paymentMethod,
      address: {
        name: profile?.user.name ?? session.user.name,
        street,
        number,
        complement: str(a.complement, 100) ?? undefined,
        neighborhood,
        city,
        state,
        zipCode,
        phone,
      },
    })
    return Response.json(order, { status: 201 })
  } catch (e) {
    if (e instanceof OrderError) {
      return Response.json({ error: e.code, message: e.message }, { status: e.code === 'OUT_OF_STOCK' ? 409 : 400 })
    }
    throw e
  }
}
