import 'server-only'
import { getDb } from './db'
import { notify, cancelOrder } from './orders'
import * as asaas from './payments/asaas'
import { PAY_WITHIN_MINUTES, PLATFORM_FEE_PERCENT } from './fees'

// Charges orders through Asaas and splits each payment:
// - the seller gets their items minus the host's share (guest sales) and VivoBuy's fee
// - a live's host gets their share of guest sales, minus VivoBuy's fee
// - VivoBuy keeps the rest: its fee, shipping, and parts it couldn't send: sellers with no
//   Asaas wallet yet, or whose wallet Asaas refused (recorded in orders.payment_split with
//   `held`, to pay out by hand). A seller using VivoBuy's own wallet just keeps it there.
// Discounts (coupons, Pix) and Asaas's own fee reduce every part in proportion.

const PLATFORM_FEE = PLATFORM_FEE_PERCENT / 100
export const paymentsEnabled = asaas.asaasEnabled

export type PaymentInfo = {
  status: 'pending' | 'paid' | 'cancelled'
  method: 'pix' | 'credit_card' | 'boleto'
  total: number
  // Pix: QR code image (PNG, base64) and the copia e cola code
  pix?: { image: string; code: string; expiresAt: string }
  // Card or boleto: Asaas's payment page
  url?: string
}

export class PaymentError extends Error {
  constructor(
    public code: 'TAX_ID' | 'NOT_FOUND' | 'PROVIDER' | 'DISABLED',
    message: string
  ) {
    super(message)
  }
}

// CPF with valid check digits, as 11 digits; null otherwise
export function normalizeCpf(value: unknown) {
  const digits = typeof value === 'string' ? value.replace(/\D/g, '') : ''
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return null
  const check = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(digits[i]) * (len + 1 - i)
    const d = (sum * 10) % 11
    return d === 10 ? 0 : d
  }
  return check(9) === Number(digits[9]) && check(10) === Number(digits[10]) ? digits : null
}

const BILLING: Record<PaymentInfo['method'], asaas.BillingType> = { pix: 'PIX', credit_card: 'CREDIT_CARD', boleto: 'BOLETO' }
// Days the buyer has to pay; an unpaid Pix/card charge then expires and the order is cancelled
const DAYS_TO_PAY: Record<PaymentInfo['method'], number> = { pix: 1, credit_card: 1, boleto: 3 }

// YYYY-MM-DD in Brasília time
const brDate = (daysAhead: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(Date.now() + daysAhead * 86_400_000))

type OrderRow = {
  id: string
  user_id: string
  status: string
  payment_method: PaymentInfo['method']
  total_cents: number
  shipping_cents: number
  payment_ref: string | null
  payment_url: string | null
}

export type SplitPart = {
  userId: string
  role: 'seller' | 'host'
  cents: number
  walletId: string | null
  // Why VivoBuy kept this part instead of sending it
  held?: 'no_wallet' | 'own_account' | 'wallet_rejected'
}

// Each seller's and host's part of an order, in centavos of what the buyer pays
async function splitParts(order: OrderRow): Promise<SplitPart[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT oi.seller_id, oi.host_id, oi.unit_price_cents * oi.quantity AS line_cents, coalesce(oi.host_share_cents, 0) AS host_cents,
              s.asaas_wallet_id AS seller_wallet, h.asaas_wallet_id AS host_wallet
       FROM order_items oi
       JOIN users s ON s.id = oi.seller_id
       LEFT JOIN users h ON h.id = oi.host_id
       WHERE oi.order_id = ?`
    )
    .bind(order.id)
    .all<{ seller_id: string; host_id: string | null; line_cents: number; host_cents: number; seller_wallet: string | null; host_wallet: string | null }>()

  const subtotal = results.reduce((sum, r) => sum + r.line_cents, 0)
  if (subtotal === 0) return []
  // What the buyer paid for the items (after discounts), less VivoBuy's fee
  const scale = ((order.total_cents - order.shipping_cents) / subtotal) * (1 - PLATFORM_FEE)

  const parts = new Map<string, SplitPart>()
  const add = (userId: string, role: SplitPart['role'], cents: number, walletId: string | null) => {
    const key = `${role}:${userId}`
    const prev = parts.get(key)
    parts.set(key, { userId, role, cents: (prev?.cents ?? 0) + cents, walletId })
  }
  for (const r of results) {
    add(r.seller_id, 'seller', r.line_cents - r.host_cents, r.seller_wallet)
    if (r.host_id && r.host_cents > 0) add(r.host_id, 'host', r.host_cents, r.host_wallet)
  }
  const own = await asaas.getOwnWalletId()
  return [...parts.values()]
    .map((p): SplitPart => {
      const cents = Math.floor(p.cents * scale)
      if (!p.walletId) return { ...p, cents, held: 'no_wallet' }
      if (p.walletId === own) return { ...p, cents, walletId: null, held: 'own_account' }
      return { ...p, cents }
    })
    .filter(p => p.cents > 0)
}

// Creates the charge, sending each part to its wallet. If Asaas refuses a wallet (a typo in
// the seller's id), the charge is created anyway with that part kept by VivoBuy, and the
// seller is told to check their wallet id: one bad wallet doesn't block the buyer.
async function createSplitCharge(order: OrderRow, customer: string, parts: SplitPart[]) {
  const charge = (sent: SplitPart[]) =>
    asaas.createCharge({
      customer,
      billingType: BILLING[order.payment_method],
      value: order.total_cents / 100,
      dueDate: brDate(DAYS_TO_PAY[order.payment_method]),
      description: `Pedido ${order.id} na VivoBuy`,
      externalReference: order.id,
      // Percent of the charge's value (Asaas takes its fee from each part in proportion)
      split: sent.map(p => ({ walletId: p.walletId!, percentualValue: Math.floor((p.cents / order.total_cents) * 1e6) / 1e4 })),
    })
  const sent = parts.filter(p => p.walletId)
  try {
    return { charge: await charge(sent), parts }
  } catch (e) {
    if (!(e instanceof asaas.AsaasError) || sent.length === 0) throw e
    // Asaas names the wallet it refused; if it doesn't, none are sent this time
    const named = sent.filter(p => e.message.includes(p.walletId!))
    const rejected = new Set(named.length ? named : sent)
    console.error('Asaas refused split wallets; keeping those parts', order.id, e.message)
    const kept = parts.map(p => (rejected.has(p) ? { ...p, walletId: null, held: 'wallet_rejected' as const } : p))
    const result = { charge: await charge(kept.filter(p => p.walletId)), parts: kept }
    if (named.length) {
      await getDb().batch(
        named.map(p =>
          notify(
            p.userId, 'order_update', 'Confira sua carteira Asaas',
            `O Asaas recusou o ID da carteira cadastrado no seu painel. Sua parte do pedido ${order.id} ficou com a VivoBuy e será repassada; corrija o ID para receber as próximas vendas direto.`,
            '/seller/dashboard'
          )
        )
      )
    }
    return result
  }
}

// The buyer's Asaas customer, created the first time they pay
async function customerFor(userId: string, taxId: string | null) {
  const db = getDb()
  const user = await db
    .prepare('SELECT name, email, tax_id, asaas_customer_id FROM users WHERE id = ?')
    .bind(userId)
    .first<{ name: string; email: string | null; tax_id: string | null; asaas_customer_id: string | null }>()
  if (!user) throw new PaymentError('NOT_FOUND', 'Conta não encontrada')
  const cpf = taxId ?? user.tax_id
  if (!cpf) throw new PaymentError('TAX_ID', 'Informe seu CPF para pagar')
  // A different CPF than before means a new Asaas customer
  if (user.asaas_customer_id && user.tax_id === cpf) return user.asaas_customer_id

  const customer = await asaas.createCustomer({ name: user.name, cpfCnpj: cpf, email: user.email ?? undefined, externalReference: userId })
  await db.prepare('UPDATE users SET tax_id = ?, asaas_customer_id = ? WHERE id = ?').bind(cpf, customer.id, userId).run()
  return customer.id
}

// Creates the order's charge the first time; afterwards returns the same one (with its
// current status), so it's safe to call again, e.g. from "Pagar" on the orders page.
// statusOnly: just whether it's paid yet (no QR code), for polling
export async function chargeOrder(
  userId: string,
  orderId: string,
  opts: { taxId?: string | null; statusOnly?: boolean } = {}
): Promise<PaymentInfo> {
  if (!asaas.asaasEnabled()) throw new PaymentError('DISABLED', 'Pagamentos ainda não estão disponíveis')
  const db = getDb()
  const order = await db
    .prepare('SELECT id, user_id, status, payment_method, total_cents, shipping_cents, payment_ref, payment_url FROM orders WHERE id = ? AND user_id = ?')
    .bind(orderId, userId)
    .first<OrderRow>()
  if (!order) throw new PaymentError('NOT_FOUND', 'Pedido não encontrado')
  const info: PaymentInfo = { status: 'pending', method: order.payment_method, total: order.total_cents / 100 }
  if (order.status === 'cancelled') return { ...info, status: 'cancelled' }
  if (order.status !== 'pending') return { ...info, status: 'paid' }

  try {
    let chargeId = order.payment_ref
    let url = order.payment_url
    if (chargeId) {
      // The webhook may not have arrived yet
      const charge = await asaas.getCharge(chargeId)
      if (asaas.PAID_STATUSES.includes(charge.status)) {
        await markPaid(chargeId)
        return { ...info, status: 'paid' }
      }
      if (opts.statusOnly) return info
    } else {
      if (opts.statusOnly) return info
      const customer = await customerFor(userId, opts.taxId ?? null)
      const { charge, parts } = await createSplitCharge(order, customer, await splitParts(order))
      // Two requests at once (double tap): keep the first charge, drop the other
      const saved = await db
        .prepare('UPDATE orders SET payment_ref = ?, payment_url = ?, payment_split = ? WHERE id = ? AND payment_ref IS NULL')
        .bind(charge.id, charge.invoiceUrl, JSON.stringify(parts), order.id)
        .run()
      if (saved.meta.changes === 0) {
        await asaas.deleteCharge(charge.id).catch(() => {})
        return chargeOrder(userId, orderId)
      }
      chargeId = charge.id
      url = charge.invoiceUrl
    }

    if (order.payment_method !== 'pix') return { ...info, url: url ?? undefined }
    const qr = await asaas.getPixQrCode(chargeId)
    return { ...info, pix: { image: qr.encodedImage, code: qr.payload, expiresAt: qr.expirationDate } }
  } catch (e) {
    if (e instanceof asaas.AsaasError) {
      console.error('Asaas error', orderId, e.message)
      throw new PaymentError('PROVIDER', `Não foi possível gerar o pagamento: ${e.message}`)
    }
    throw e
  }
}

// Payment received: the order is confirmed and everyone is told. Safe to repeat.
export async function markPaid(chargeId: string) {
  const db = getDb()
  const order = await db
    .prepare(
      `UPDATE orders SET status = 'confirmed', paid_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE payment_ref = ? AND status = 'pending'
       RETURNING id, user_id`
    )
    .bind(chargeId)
    .first<{ id: string; user_id: string }>()
  if (!order) {
    const cancelled = await db
      .prepare(`SELECT id FROM orders WHERE payment_ref = ? AND status = 'cancelled'`)
      .bind(chargeId)
      .first<{ id: string }>()
    // Paid at the same moment it was cancelled: needs a refund in Asaas
    if (cancelled) console.error('Payment received for a cancelled order; refund it in Asaas', cancelled.id, chargeId)
    return false
  }
  const { results: items } = await db
    .prepare('SELECT DISTINCT seller_id, host_id FROM order_items WHERE order_id = ?')
    .bind(order.id)
    .all<{ seller_id: string; host_id: string | null }>()
  const sellers = new Set(items.map(i => i.seller_id))
  const hosts = new Set(items.flatMap(i => (i.host_id && !sellers.has(i.host_id) ? [i.host_id] : [])))
  await db.batch([
    notify(order.user_id, 'order_update', 'Pagamento confirmado', `Recebemos o pagamento do pedido ${order.id}.`, '/orders'),
    ...[...sellers].map(id =>
      notify(id, 'order_update', 'Novo pedido pago', `O pedido ${order.id} foi pago. Já pode preparar o envio.`, '/seller/dashboard')
    ),
    ...[...hosts].map(id =>
      notify(id, 'order_update', 'Venda de convidado', `Um convidado vendeu na sua live e o pedido ${order.id} foi pago.`, '/seller/dashboard')
    ),
  ])
  return true
}

// The buyer cancels an unpaid order: its charge is removed first so it can't be paid afterwards
export async function cancelUnpaidOrder(userId: string, orderId: string): Promise<'cancelled' | 'paid' | 'not_pending'> {
  const order = await getDb()
    .prepare(`SELECT payment_ref FROM orders WHERE id = ? AND user_id = ? AND status = 'pending'`)
    .bind(orderId, userId)
    .first<{ payment_ref: string | null }>()
  if (!order) return 'not_pending'
  if (order.payment_ref && asaas.asaasEnabled()) {
    const charge = await asaas.getCharge(order.payment_ref).catch(() => null)
    if (charge && asaas.PAID_STATUSES.includes(charge.status)) {
      await markPaid(order.payment_ref)
      return 'paid'
    }
    await asaas.deleteCharge(order.payment_ref).catch(e => console.error('Could not delete Asaas charge', order.payment_ref, e))
  }
  return (await cancelOrder(orderId, { userId })) ? 'cancelled' : 'not_pending'
}

// Cancels Pix and card orders not paid within PAY_WITHIN_MINUTES (run by the cron in
// worker.ts). Their charge is removed first, so it can't be paid afterwards.
export async function expireUnpaidOrders() {
  if (!asaas.asaasEnabled()) return 0
  const since = (minutes: number) => `strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-${minutes} minutes')`
  const { results } = await getDb()
    .prepare(
      `SELECT id, payment_ref FROM orders
       WHERE status = 'pending' AND (
         (payment_method = 'pix' AND created_at <= ${since(PAY_WITHIN_MINUTES.pix)}) OR
         (payment_method = 'credit_card' AND created_at <= ${since(PAY_WITHIN_MINUTES.credit_card)}))
       LIMIT 50`
    )
    .all<{ id: string; payment_ref: string | null }>()
  let cancelled = 0
  for (const order of results) {
    if (order.payment_ref) {
      const charge = await asaas.getCharge(order.payment_ref).catch(() => null)
      // Asaas didn't answer: try again on the next run rather than cancel a paid order
      if (!charge) continue
      if (asaas.PAID_STATUSES.includes(charge.status)) {
        await markPaid(order.payment_ref)
        continue
      }
      await asaas.deleteCharge(order.payment_ref).catch(e => console.error('Could not delete Asaas charge', order.payment_ref, e))
    }
    if (await cancelOrder(order.id, { reason: 'expired' })) cancelled++
  }
  return cancelled
}

// Asaas webhook events about a charge (Asaas → Integrações → Webhooks)
export async function handleChargeEvent(event: string, chargeId: string) {
  switch (event) {
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_CONFIRMED':
      await markPaid(chargeId)
      break
    // Not paid in time, or removed in Asaas: the order is cancelled and its stock freed
    case 'PAYMENT_OVERDUE':
    case 'PAYMENT_DELETED': {
      const order = await getDb()
        .prepare(`SELECT id FROM orders WHERE payment_ref = ? AND status = 'pending'`)
        .bind(chargeId)
        .first<{ id: string }>()
      if (order) await cancelOrder(order.id, { reason: 'expired' })
      break
    }
    case 'PAYMENT_REFUNDED':
    case 'PAYMENT_CHARGEBACK_REQUESTED':
      console.warn('Charge refunded or disputed; handle the order by hand', event, chargeId)
      break
  }
}
