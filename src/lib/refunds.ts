import 'server-only'
import { getDb } from './db'
import { notify, releaseOrder } from './orders'
import * as asaas from './payments/asaas'
import { REFUND_WINDOW_DAYS } from './fees'

// Refunds always return the whole order:
// - nothing shipped yet: the buyer gets the money back right away
// - shipped: the buyer asks, and it's refunded once every seller who shipped confirms the
//   product came back
// Asaas tells us when the money was returned (PAYMENT_REFUNDED), which also covers refunds
// made in its panel and lost chargebacks. Asaas's fee on the charge isn't returned to VivoBuy.

export type RefundStatus = 'requested' | 'processing' | 'failed' | 'chargeback' | 'refunded'

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
// A failed refund is tried again this long after the last attempt (run by the cron in worker.ts)
const RETRY_AFTER_MINUTES = 60

// The law gives 7 days from receipt, which we don't record, so the window counts from the last
// shipment with room for the delivery
export function canRefund(order: { status: string; refundStatus: string | null; paid: boolean }, lastShippedAt: string | null) {
  if (!order.paid || order.refundStatus || !['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status)) return false
  return !lastShippedAt || Date.now() - Date.parse(lastShippedAt) <= REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000
}

const sellersOf = async (orderId: string) => {
  const { results } = await getDb()
    .prepare('SELECT DISTINCT seller_id FROM order_items WHERE order_id = ?')
    .bind(orderId)
    .all<{ seller_id: string }>()
  return results.map(r => r.seller_id)
}

// The buyer gives up the purchase
export async function requestRefund(userId: string, orderId: string): Promise<'refunding' | 'requested' | 'not_refundable'> {
  const db = getDb()
  const order = await db
    .prepare(
      `SELECT o.status, o.payment_ref, o.payment_env, o.paid_at, o.refund_status,
              (SELECT max(shipped_at) FROM order_shipments WHERE order_id = o.id) AS last_shipped_at
       FROM orders o WHERE o.id = ? AND o.user_id = ?`
    )
    .bind(orderId, userId)
    .first<{
      status: string
      payment_ref: string | null
      payment_env: string | null
      paid_at: string | null
      refund_status: string | null
      last_shipped_at: string | null
    }>()
  if (!order || !order.payment_ref || order.payment_env !== asaas.asaasEnv()) return 'not_refundable'
  if (!canRefund({ status: order.status, refundStatus: order.refund_status, paid: !!order.paid_at }, order.last_shipped_at)) {
    return 'not_refundable'
  }
  if (!order.last_shipped_at) {
    await refundOrder(orderId)
    return 'refunding'
  }

  const claimed = await db
    .prepare(`UPDATE orders SET refund_status = 'requested' WHERE id = ? AND refund_status IS NULL`)
    .bind(orderId)
    .run()
  if (claimed.meta.changes === 0) return 'not_refundable'
  const { results: shippers } = await db
    .prepare('SELECT seller_id FROM order_shipments WHERE order_id = ? AND shipped_at IS NOT NULL')
    .bind(orderId)
    .all<{ seller_id: string }>()
  await db.batch([
    notify(userId, 'order_update', 'Devolução solicitada', `O vendedor vai falar com você para combinar a devolução do pedido ${orderId}. O reembolso sai quando ele receber o produto.`, '/orders'),
    ...shippers.map(s =>
      notify(s.seller_id, 'order_update', 'Devolução solicitada', `O comprador desistiu do pedido ${orderId}. Combine a devolução e confirme no painel quando receber o produto.`, '/seller/dashboard')
    ),
  ])
  return 'requested'
}

// A seller got the shipped product back; the refund goes out once all of them have
export async function confirmReturn(sellerId: string, orderId: string) {
  const db = getDb()
  const saved = await db
    .prepare(
      `UPDATE order_shipments SET return_confirmed_at = coalesce(return_confirmed_at, ${NOW})
       WHERE order_id = ?1 AND seller_id = ?2 AND shipped_at IS NOT NULL
         AND EXISTS (SELECT 1 FROM orders WHERE id = ?1 AND refund_status = 'requested')`
    )
    .bind(orderId, sellerId)
    .run()
  if (saved.meta.changes === 0) return false
  const waiting = await db
    .prepare('SELECT 1 FROM order_shipments WHERE order_id = ? AND shipped_at IS NOT NULL AND return_confirmed_at IS NULL')
    .bind(orderId)
    .first()
  if (!waiting) await refundOrder(orderId)
  return true
}

// Sends the refund to Asaas. Claiming it first means it's asked for at most once at a time;
// from here on sellers can't ship the order. A refusal (e.g. no balance) is kept as 'failed'.
export async function refundOrder(orderId: string) {
  const db = getDb()
  const order = await db
    .prepare(
      `UPDATE orders SET refund_status = 'processing', refund_attempted_at = ${NOW}
       WHERE id = ? AND payment_ref IS NOT NULL AND refunded_at IS NULL
         AND (refund_status IS NULL OR refund_status IN ('requested', 'failed'))
       RETURNING user_id, payment_ref, payment_method`
    )
    .bind(orderId)
    .first<{ user_id: string; payment_ref: string; payment_method: string }>()
  if (!order) return
  try {
    if (order.payment_method === 'boleto') {
      const { requestUrl } = await asaas.refundBoleto(order.payment_ref)
      await db.batch([
        db.prepare('UPDATE orders SET refund_url = ? WHERE id = ?').bind(requestUrl, orderId),
        notify(order.user_id, 'order_update', 'Informe sua conta para o reembolso', `Para devolver o valor do pedido ${orderId}, preencha seus dados bancários no link em "Meus pedidos".`, '/orders'),
      ])
      return
    }
    const charge = await asaas.refundCharge(order.payment_ref)
    if (charge.status === 'REFUNDED') await finishRefund(order.payment_ref)
  } catch (e) {
    if (!(e instanceof asaas.AsaasError)) throw e
    console.error('Refund failed', orderId, e.message)
    await db.prepare(`UPDATE orders SET refund_status = 'failed' WHERE id = ? AND refund_status = 'processing'`).bind(orderId).run()
  }
}

// Asaas returned the money: the order ends cancelled and refunded. Safe to repeat.
export async function finishRefund(chargeId: string) {
  const db = getDb()
  const order = await db
    .prepare(
      `SELECT id, user_id, status,
              EXISTS (SELECT 1 FROM order_shipments s WHERE s.order_id = orders.id AND s.shipped_at IS NOT NULL) AS shipped
       FROM orders WHERE payment_ref = ?`
    )
    .bind(chargeId)
    .first<{ id: string; user_id: string; status: string; shipped: number }>()
  if (!order) return
  const claimed = await db
    .prepare(`UPDATE orders SET status = 'cancelled', refund_status = 'refunded', refunded_at = ${NOW} WHERE id = ? AND refunded_at IS NULL`)
    .bind(order.id)
    .run()
  if (claimed.meta.changes === 0) return
  const sellers = await sellersOf(order.id)
  await db.batch([
    // Already cancelled (paid just as it was cancelled): cancelling gave these back.
    // Shipped units may not come back in sellable shape, so sellers adjust that stock themselves.
    ...(order.status === 'cancelled' ? [] : releaseOrder(order.id, { restock: !order.shipped })),
    notify(order.user_id, 'order_update', 'Reembolso feito', `Devolvemos o valor do pedido ${order.id}. No cartão, pode levar até duas faturas para aparecer.`, '/orders'),
    ...sellers.map(id =>
      notify(id, 'order_update', 'Pedido reembolsado', `O pedido ${order.id} foi reembolsado e saiu das suas vendas.`, '/seller/dashboard')
    ),
  ])
}

// Asaas refused a boleto refund after checking the buyer's details
export async function refundDenied(chargeId: string) {
  const order = await getDb()
    .prepare(`UPDATE orders SET refund_status = 'failed' WHERE payment_ref = ? AND refund_status = 'processing' RETURNING id, user_id`)
    .bind(chargeId)
    .first<{ id: string; user_id: string }>()
  if (!order) return
  console.error('Refund denied by Asaas', order.id, chargeId)
  await notify(order.user_id, 'order_update', 'Reembolso não aprovado', `O Asaas não aprovou os dados do reembolso do pedido ${order.id}. Confira e envie de novo pelo link em "Meus pedidos".`, '/orders').run()
}

// The card holder disputed the charge: sellers hold the shipment until it's decided
export async function chargebackOpened(chargeId: string) {
  const db = getDb()
  const order = await db
    .prepare(
      `UPDATE orders SET refund_status = 'chargeback'
       WHERE payment_ref = ? AND refunded_at IS NULL AND coalesce(refund_status, '') != 'chargeback'
       RETURNING id`
    )
    .bind(chargeId)
    .first<{ id: string }>()
  if (!order) return
  await db.batch((await sellersOf(order.id)).map(id =>
    notify(id, 'order_update', 'Pagamento contestado', `O pagamento do pedido ${order.id} foi contestado no cartão. Se ainda não enviou, não envie até a decisão.`, '/seller/dashboard')
  ))
}

// The dispute was won: the charge stands and the order carries on
export async function chargebackWon(chargeId: string) {
  const db = getDb()
  const order = await db
    .prepare(`UPDATE orders SET refund_status = NULL WHERE payment_ref = ? AND refund_status = 'chargeback' RETURNING id`)
    .bind(chargeId)
    .first<{ id: string }>()
  if (!order) return
  await db.batch((await sellersOf(order.id)).map(id =>
    notify(id, 'order_update', 'Contestação encerrada', `A contestação do pedido ${order.id} foi resolvida a favor da venda. Pode seguir com o envio.`, '/seller/dashboard')
  ))
}

// Tries refused refunds again (run by the cron in worker.ts). Boleto waits for the buyer's
// details at the link it already has.
export async function retryFailedRefunds() {
  if (!asaas.asaasEnabled()) return
  const { results } = await getDb()
    .prepare(
      `SELECT id FROM orders
       WHERE refund_status = 'failed' AND payment_method != 'boleto' AND payment_env = ?
         AND refund_attempted_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-${RETRY_AFTER_MINUTES} minutes')
       LIMIT 20`
    )
    .bind(asaas.asaasEnv())
    .all<{ id: string }>()
  for (const { id } of results) await refundOrder(id)
}
