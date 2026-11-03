import 'server-only'
import { getDb } from './db'
import { asaasEnv } from './payments/asaas'
import { PLATFORM_FEE_PERCENT } from './fees'

// Numbers for the founders' dashboard. Sales only count the Asaas environment in use, so
// sandbox tests never mix with real money. Refunded orders aren't sales.

const DAY_MS = 86_400_000
const ACTIVE_DAYS = 30
const MONTHS_SHOWN = 6
const LATE_SHIPPING_DAYS = 3
const STUCK_REFUND_HOURS = 24
const STALE_RETURN_DAYS = 7

const SOLD = `o.paid_at IS NOT NULL AND o.refunded_at IS NULL AND o.payment_env = ?3`

interface Period {
  activeUsers: number
  visitors: number
  signups: number
  salesCents: number
  shippingCents: number
  orders: number
  refunds: number
  sellersWithSales: number
  lives: number
}

async function period(from: Date, to: Date, env: string): Promise<Period> {
  const row = await getDb()
    .prepare(
      `SELECT
         (SELECT count(DISTINCT user_id) FROM visits WHERE user_id IS NOT NULL AND day >= substr(?1, 1, 10) AND day < substr(?2, 1, 10)) AS active_users,
         (SELECT count(DISTINCT visitor_id) FROM visits WHERE day >= substr(?1, 1, 10) AND day < substr(?2, 1, 10)) AS visitors,
         (SELECT count(*) FROM users WHERE created_at >= ?1 AND created_at < ?2) AS signups,
         (SELECT coalesce(sum(o.total_cents), 0) FROM orders o WHERE ${SOLD} AND o.paid_at >= ?1 AND o.paid_at < ?2) AS sales,
         (SELECT coalesce(sum(o.shipping_cents), 0) FROM orders o WHERE ${SOLD} AND o.paid_at >= ?1 AND o.paid_at < ?2) AS shipping,
         (SELECT count(*) FROM orders o WHERE ${SOLD} AND o.paid_at >= ?1 AND o.paid_at < ?2) AS orders,
         (SELECT count(*) FROM orders o WHERE o.refunded_at >= ?1 AND o.refunded_at < ?2 AND o.payment_env = ?3) AS refunds,
         (SELECT count(DISTINCT oi.seller_id) FROM order_items oi JOIN orders o ON o.id = oi.order_id
          WHERE ${SOLD} AND o.paid_at >= ?1 AND o.paid_at < ?2) AS sellers,
         (SELECT count(*) FROM streams WHERE started_at >= ?1 AND started_at < ?2 AND blocked_at IS NULL) AS lives`
    )
    .bind(from.toISOString(), to.toISOString(), env)
    .first<Record<string, number>>()
  return {
    activeUsers: row?.active_users ?? 0,
    visitors: row?.visitors ?? 0,
    signups: row?.signups ?? 0,
    salesCents: row?.sales ?? 0,
    shippingCents: row?.shipping ?? 0,
    orders: row?.orders ?? 0,
    refunds: row?.refunds ?? 0,
    sellersWithSales: row?.sellers ?? 0,
    lives: row?.lives ?? 0,
  }
}

export interface Metric {
  label: string
  value: number
  previous: number
  format: 'number' | 'money' | 'percent'
  hint?: string
}

export interface MonthPoint {
  month: string
  sales: number
  signups: number
  activeUsers: number
}

export interface Alert {
  level: 'critical' | 'warning'
  title: string
  detail: string
  href?: string
}

const toMetrics = (now: Period, before: Period): Metric[] => {
  const fee = (p: Period) => ((p.salesCents - p.shippingCents) * PLATFORM_FEE_PERCENT) / 100 / 100
  const conversion = (p: Period) => (p.visitors ? (p.orders / p.visitors) * 100 : 0)
  const ticket = (p: Period) => (p.orders ? p.salesCents / p.orders / 100 : 0)
  const refundRate = (p: Period) => (p.orders + p.refunds ? (p.refunds / (p.orders + p.refunds)) * 100 : 0)
  return [
    { label: 'Usuários ativos', value: now.activeUsers, previous: before.activeUsers, format: 'number', hint: 'Contas que abriram o site' },
    { label: 'Visitantes', value: now.visitors, previous: before.visitors, format: 'number', hint: 'Com ou sem conta' },
    { label: 'Novos cadastros', value: now.signups, previous: before.signups, format: 'number' },
    { label: 'Vendas', value: now.salesCents / 100, previous: before.salesCents / 100, format: 'money', hint: 'Total pago pelos compradores' },
    { label: 'Receita da Luma', value: fee(now), previous: fee(before), format: 'money', hint: `Estimativa: ${PLATFORM_FEE_PERCENT}% sem frete, antes da taxa do Asaas` },
    { label: 'Pedidos pagos', value: now.orders, previous: before.orders, format: 'number' },
    { label: 'Ticket médio', value: ticket(now), previous: ticket(before), format: 'money' },
    { label: 'Conversão', value: conversion(now), previous: conversion(before), format: 'percent', hint: 'Pedidos pagos por visitante' },
    { label: 'Vendedores com venda', value: now.sellersWithSales, previous: before.sellersWithSales, format: 'number' },
    { label: 'Lives realizadas', value: now.lives, previous: before.lives, format: 'number' },
    { label: 'Taxa de reembolso', value: refundRate(now), previous: refundRate(before), format: 'percent' },
  ]
}

async function monthly(env: string): Promise<MonthPoint[]> {
  const db = getDb()
  // Months in Brasília time
  const br = new Date(Date.now() - 3 * 3_600_000)
  const months = Array.from({ length: MONTHS_SHOWN }, (_, i) => {
    const d = new Date(Date.UTC(br.getUTCFullYear(), br.getUTCMonth() - (MONTHS_SHOWN - 1 - i), 1))
    return d.toISOString().slice(0, 7)
  })
  const first = `${months[0]}-01`
  const [{ results: sales }, { results: signups }, { results: active }] = await db.batch<{ month: string; n: number }>([
    db
      .prepare(
        `SELECT strftime('%Y-%m', o.paid_at, '-3 hours') AS month, sum(o.total_cents) AS n FROM orders o
         WHERE o.paid_at >= ?1 AND o.refunded_at IS NULL AND o.payment_env = ?2 GROUP BY month`
      )
      .bind(first, env),
    db.prepare(`SELECT strftime('%Y-%m', created_at, '-3 hours') AS month, count(*) AS n FROM users WHERE created_at >= ?1 GROUP BY month`).bind(first),
    db.prepare(`SELECT substr(day, 1, 7) AS month, count(DISTINCT user_id) AS n FROM visits WHERE day >= ?1 AND user_id IS NOT NULL GROUP BY month`).bind(first),
  ])
  const of = (rows: { month: string; n: number }[], month: string) => rows.find(r => r.month === month)?.n ?? 0
  return months.map(month => ({
    month,
    sales: of(sales, month) / 100,
    signups: of(signups, month),
    activeUsers: of(active, month),
  }))
}

async function alerts(env: string): Promise<Alert[]> {
  const row = await getDb()
    .prepare(
      `SELECT
         (SELECT count(*) FROM orders WHERE refund_status = 'failed') AS failed_refunds,
         (SELECT count(*) FROM orders WHERE refund_status = 'processing'
            AND refund_attempted_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-${STUCK_REFUND_HOURS} hours')) AS stuck_refunds,
         (SELECT count(*) FROM orders WHERE refund_status = 'requested'
            AND refund_requested_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-${STALE_RETURN_DAYS} days')) AS stale_returns,
         (SELECT count(*) FROM orders WHERE refund_status = 'chargeback') AS chargebacks,
         (SELECT count(*) FROM reports WHERE status = 'open') AS open_reports,
         (SELECT count(DISTINCT o.id) FROM orders o JOIN order_shipments s ON s.order_id = o.id
            WHERE o.status IN ('confirmed', 'processing') AND o.refund_status IS NULL AND s.shipped_at IS NULL
              AND o.paid_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-${LATE_SHIPPING_DAYS} days')) AS late_shipments,
         (SELECT coalesce(sum(json_extract(p.value, '$.cents')), 0) FROM orders o, json_each(o.payment_split) p
            WHERE o.paid_at IS NOT NULL AND o.refunded_at IS NULL AND o.payment_env = ?1
              AND json_extract(p.value, '$.held') IN ('no_wallet', 'wallet_rejected')) AS held_cents,
         (SELECT count(*) FROM notifications WHERE email_status = 'failed'
            AND created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')) AS failed_emails`
    )
    .bind(env)
    .first<Record<string, number>>()
  const n = (key: string) => row?.[key] ?? 0
  const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const count = (key: string, one: string, many: string) => `${n(key)} ${n(key) === 1 ? one : many}`
  const list: (Alert | false)[] = [
    n('failed_refunds') > 0 && { level: 'critical', title: count('failed_refunds', 'reembolso recusado', 'reembolsos recusados'), detail: 'O Asaas recusou o estorno. O comprador está esperando.', href: '/admin/moderation' },
    n('chargebacks') > 0 && { level: 'critical', title: count('chargebacks', 'chargeback aberto', 'chargebacks abertos'), detail: 'Pagamento contestado no cartão. Responda no painel do Asaas.' },
    n('stuck_refunds') > 0 && { level: 'critical', title: `${count('stuck_refunds', 'reembolso parado', 'reembolsos parados')} há mais de ${STUCK_REFUND_HOURS} h`, detail: 'Enviado ao Asaas, sem confirmação. Confira o painel do Asaas.' },
    n('held_cents') > 0 && { level: 'critical', title: `${money(n('held_cents'))} de vendedores na sua conta`, detail: 'Vendas de quem não tinha carteira válida. Esse valor precisa ser repassado.' },
    n('stale_returns') > 0 && { level: 'warning', title: `${count('stale_returns', 'devolução', 'devoluções')} sem resposta há mais de ${STALE_RETURN_DAYS} dias`, detail: 'O vendedor não confirmou. Você pode reembolsar pela moderação.', href: '/admin/moderation' },
    n('late_shipments') > 0 && { level: 'warning', title: `${count('late_shipments', 'pedido pago', 'pedidos pagos')} sem envio há mais de ${LATE_SHIPPING_DAYS} dias`, detail: 'O comprador pode reclamar ou pedir reembolso.' },
    n('open_reports') > 0 && { level: 'warning', title: count('open_reports', 'denúncia aberta', 'denúncias abertas'), detail: 'Aguardando sua decisão.', href: '/admin/moderation' },
    n('failed_emails') > 0 && { level: 'warning', title: `${count('failed_emails', 'e-mail não enviado', 'e-mails não enviados')} em 7 dias`, detail: 'O Brevo recusou o envio. Confira os endereços ou o remetente.' },
  ]
  return list.filter((a): a is Alert => !!a)
}

async function recentErrors() {
  const { results } = await getDb()
    .prepare(
      `SELECT source, message, count(*) AS times, max(created_at) AS last_at FROM error_log
       WHERE created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')
       GROUP BY source, message ORDER BY last_at DESC LIMIT 20`
    )
    .all<{ source: string; message: string; times: number; last_at: string }>()
  return results.map(r => ({ source: r.source, message: r.message, times: r.times, lastAt: r.last_at }))
}

// How far sellers get, all time: where the seller journey is losing people
async function sellerFunnel(env: string) {
  const row = await getDb()
    .prepare(
      `SELECT
         (SELECT count(*) FROM users WHERE is_seller = 1) AS sellers,
         (SELECT count(DISTINCT seller_id) FROM products WHERE blocked_at IS NULL) AS with_product,
         (SELECT count(DISTINCT host_id) FROM streams WHERE started_at IS NOT NULL) AS went_live,
         (SELECT count(DISTINCT oi.seller_id) FROM order_items oi JOIN orders o ON o.id = oi.order_id
            WHERE o.paid_at IS NOT NULL AND o.refunded_at IS NULL AND o.payment_env = ?1) AS sold`
    )
    .bind(env)
    .first<Record<string, number>>()
  return [
    { label: 'Contas de vendedor', value: row?.sellers ?? 0 },
    { label: 'Cadastraram produto', value: row?.with_product ?? 0 },
    { label: 'Fizeram live', value: row?.went_live ?? 0 },
    { label: 'Venderam', value: row?.sold ?? 0 },
  ]
}

async function topSellers(from: Date, env: string) {
  const { results } = await getDb()
    .prepare(
      `SELECT u.name, sum(oi.unit_price_cents * oi.quantity) AS cents, count(DISTINCT o.id) AS orders
       FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN users u ON u.id = oi.seller_id
       WHERE o.paid_at >= ?1 AND o.refunded_at IS NULL AND o.payment_env = ?2
       GROUP BY oi.seller_id ORDER BY cents DESC LIMIT 5`
    )
    .bind(from.toISOString(), env)
    .all<{ name: string; cents: number; orders: number }>()
  return results.map(r => ({ name: r.name, sales: r.cents / 100, orders: r.orders }))
}

export async function getFoundersDashboard() {
  const env = asaasEnv()
  const now = new Date()
  // Visits are stored by Brasília day and compared by date, so "to" is tomorrow to include today
  const tomorrow = new Date(now.getTime() + DAY_MS)
  const from = new Date(now.getTime() - ACTIVE_DAYS * DAY_MS)
  const before = new Date(now.getTime() - 2 * ACTIVE_DAYS * DAY_MS)
  const [current, previous, months, alertList, errors, funnel, sellers] = await Promise.all([
    period(from, tomorrow, env),
    period(before, from, env),
    monthly(env),
    alerts(env),
    recentErrors(),
    sellerFunnel(env),
    topSellers(from, env),
  ])
  return { sandbox: env !== 'production', metrics: toMetrics(current, previous), months, alerts: alertList, errors, funnel, sellers }
}

export type FoundersDashboard = Awaited<ReturnType<typeof getFoundersDashboard>>
