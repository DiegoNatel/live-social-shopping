import 'server-only'
import { getDb, activeFlashSales, flashPriceCents } from './db'
import { checkCoupon } from './coupons'
import { toAddress } from './addresses'
import { computeTotals, VARIANT_TYPES, type AppliedCoupon } from './pricing'
import { liveSplits, HOST_SHARE } from './guests'
import { quoteShipping, ShippingError, type ShippingOptionId } from './shipping'
import { canRefund, type RefundStatus } from './refunds'
import { asaasEnv } from './payments/asaas'
import type { Address, OrderStatus, PaymentMethod } from '@/types'

export type NewAddress = Omit<Address, 'id' | 'isDefault'>

export interface NewOrderInput {
  items: { productId: string; quantity: number; variants?: Record<string, string> }[]
  paymentMethod: Extract<PaymentMethod, 'pix' | 'credit_card' | 'boleto'>
  address: NewAddress
  couponCode?: string
  // Total the customer saw, in centavos; the order is refused if the real total differs
  expectedTotalCents?: number
  // Paying for a won auction: one unit of the auctioned product at the winning bid
  auctionId?: string
  // Freight option chosen at checkout (quoted again here, so the price can't be tampered with)
  shippingOption: ShippingOptionId
}

export class OrderError extends Error {
  constructor(
    public code: 'EMPTY' | 'NOT_FOUND' | 'OUT_OF_STOCK' | 'INVALID' | 'COUPON' | 'PRICE_CHANGED' | 'SHIPPING',
    message: string
  ) {
    super(message)
  }
}

const newId = () => crypto.randomUUID()
const orderNumber = () => `VB-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`

export type CartItemInput = NewOrderInput['items'][number]

export interface PricedLine {
  productId: string
  sellerId: string
  name: string
  quantity: number
  unitPriceCents: number
  variants: Record<string, string> | null
  flashSaleId: string | null
}

// Prices a cart from the database (never from the client) and checks stock.
// Used by the order API and the coupon preview, so both see the same subtotal.
// fixedUnitPriceCents sets a product's price outright (a won auction): no flash sale or variant modifiers
export async function priceCart(items: CartItemInput[], opts: { fixedUnitPriceCents?: Map<string, number> } = {}) {
  const db = getDb()
  if (items.length === 0) throw new OrderError('EMPTY', 'Carrinho vazio')

  // Merge duplicate lines of the same product/variant
  const lines = new Map<string, CartItemInput>()
  for (const item of items) {
    const key = `${item.productId}|${VARIANT_TYPES.map(t => item.variants?.[t] ?? '').join('|')}`
    const prev = lines.get(key)
    lines.set(key, prev ? { ...prev, quantity: prev.quantity + item.quantity } : { ...item })
  }

  const ids = [...new Set(items.map(i => i.productId))]
  const [{ results: products }, { results: variantRows }, flashSales] = await Promise.all([
    db
      .prepare(
        `SELECT id, seller_id, name, price_cents, stock FROM products
         WHERE is_active = 1 AND id IN (${ids.map(() => '?').join(',')})`
      )
      .bind(...ids)
      .all<{ id: string; seller_id: string; name: string; price_cents: number; stock: number }>(),
    db
      .prepare(
        `SELECT id, product_id, type, name, stock, price_modifier_cents FROM product_variants
         WHERE product_id IN (${ids.map(() => '?').join(',')})`
      )
      .bind(...ids)
      .all<{ id: string; product_id: string; type: string; name: string; stock: number; price_modifier_cents: number }>(),
    activeFlashSales(ids),
  ])
  const byId = new Map(products.map(p => [p.id, p]))

  let subtotal = 0
  const qtyByProduct = new Map<string, number>()
  const qtyByVariant = new Map<string, number>()
  const priced: PricedLine[] = []
  for (const line of lines.values()) {
    const product = byId.get(line.productId)
    if (!product) throw new OrderError('NOT_FOUND', 'Um produto do carrinho não está mais disponível')

    // Each variant type the product offers must be chosen, and only those
    const offered = variantRows.filter(v => v.product_id === product.id)
    const chosen = Object.entries(line.variants ?? {})
    if (chosen.some(([type]) => !offered.some(v => v.type === type))) {
      throw new OrderError('INVALID', `Opção inválida: ${product.name}`)
    }
    // A running flash sale discounts the base price; variant modifiers are added on top
    const fixed = opts.fixedUnitPriceCents?.get(product.id)
    const sale = fixed === undefined ? flashSales.get(product.id) : undefined
    let unitPriceCents = fixed ?? (sale ? flashPriceCents(product.price_cents, sale.discountPercent) : product.price_cents)
    const variants: Record<string, string> = {}
    for (const type of VARIANT_TYPES) {
      if (!offered.some(v => v.type === type)) continue
      const v = offered.find(v => v.type === type && v.name === line.variants?.[type])
      if (!v) throw new OrderError('INVALID', `Escolha as opções de ${product.name}`)
      if (fixed === undefined) unitPriceCents += v.price_modifier_cents
      variants[type] = v.name
      qtyByVariant.set(v.id, (qtyByVariant.get(v.id) ?? 0) + line.quantity)
    }
    if (unitPriceCents <= 0) throw new OrderError('INVALID', `Preço inválido: ${product.name}`)

    priced.push({
      productId: product.id,
      sellerId: product.seller_id,
      name: product.name,
      quantity: line.quantity,
      unitPriceCents,
      variants: Object.keys(variants).length ? variants : null,
      flashSaleId: sale?.id ?? null,
    })
    subtotal += unitPriceCents * line.quantity
    qtyByProduct.set(product.id, (qtyByProduct.get(product.id) ?? 0) + line.quantity)
  }
  for (const [productId, qty] of qtyByProduct) {
    const product = byId.get(productId)!
    if (product.stock < qty) throw new OrderError('OUT_OF_STOCK', `Estoque insuficiente: ${product.name}`)
  }
  for (const [variantId, qty] of qtyByVariant) {
    const v = variantRows.find(v => v.id === variantId)!
    if (v.stock < qty) {
      throw new OrderError('OUT_OF_STOCK', `Estoque insuficiente: ${byId.get(v.product_id)!.name} (${v.name})`)
    }
  }

  const qtyByFlashSale = new Map<string, number>()
  for (const line of priced) {
    if (line.flashSaleId) qtyByFlashSale.set(line.flashSaleId, (qtyByFlashSale.get(line.flashSaleId) ?? 0) + line.quantity)
  }
  for (const [productId, sale] of flashSales) {
    const qty = qtyByFlashSale.get(sale.id) ?? 0
    if (qty > sale.remaining) {
      throw new OrderError('OUT_OF_STOCK', `Restam ${sale.remaining} unidades na oferta relâmpago de ${byId.get(productId)!.name}`)
    }
  }
  return { lines: priced, subtotal, qtyByProduct, qtyByVariant, qtyByFlashSale }
}

// The winning bid, if this user won the auction and the order is for exactly what was auctioned
async function wonAuctionPrice(userId: string, input: NewOrderInput) {
  const won = await getDb()
    .prepare(`SELECT product_id, current_bid_cents FROM auctions WHERE id = ? AND winner_id = ? AND status = 'ended'`)
    .bind(input.auctionId, userId)
    .first<{ product_id: string; current_bid_cents: number }>()
  if (!won) throw new OrderError('INVALID', 'Este arremate não está disponível')
  const [item] = input.items
  if (input.items.length !== 1 || item.productId !== won.product_id || item.quantity !== 1) {
    throw new OrderError('INVALID', 'O pedido do arremate é de uma unidade do produto leiloado')
  }
  if (input.couponCode) throw new OrderError('COUPON', 'Cupons não valem para arremates')
  return new Map([[won.product_id, won.current_bid_cents]])
}

// notifySellers: tell sellers and hosts now. With online payment they're told once it's paid
// (markPaid in lib/payments.ts), so nobody ships an order that was never paid.
export async function createOrder(userId: string, input: NewOrderInput, { notifySellers = true } = {}) {
  const db = getDb()
  const fixedUnitPriceCents = input.auctionId ? await wonAuctionPrice(userId, input) : undefined
  const { lines, subtotal, qtyByProduct, qtyByVariant, qtyByFlashSale } = await priceCart(input.items, { fixedUnitPriceCents })
  // Guest sellers' products sold through a host's live: the host gets HOST_SHARE of the line
  const splits = await liveSplits([...qtyByProduct.keys()], input.auctionId)

  let coupon: AppliedCoupon | null = null
  if (input.couponCode) {
    const check = await checkCoupon(input.couponCode, userId, subtotal)
    if (!check.ok) throw new OrderError('COUPON', check.message)
    coupon = check.coupon
  }

  let shippingOptions
  try {
    shippingOptions = await quoteShipping(input.address.zipCode, lines)
  } catch (e) {
    if (e instanceof ShippingError) throw new OrderError('SHIPPING', e.message)
    throw e
  }
  const shipping = shippingOptions.find(o => o.id === input.shippingOption) ?? shippingOptions[0]

  const totals = computeTotals(subtotal, { coupon, pix: input.paymentMethod === 'pix', shippingCents: shipping.cents })
  // The cart shows prices saved in the browser; if any changed, show the new total before charging
  if (input.expectedTotalCents !== undefined && input.expectedTotalCents !== totals.total) {
    throw new OrderError('PRICE_CHANGED', 'Os preços mudaram. Confira o novo total antes de finalizar.')
  }

  const orderId = orderNumber()
  const statements = [
    db
      .prepare(
        `INSERT INTO orders (id, user_id, status, payment_method, subtotal_cents, shipping_cents,
                             discount_cents, total_cents, shipping_address, coupon_code, coupon_discount_cents, auction_id)
         VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        orderId, userId, input.paymentMethod, subtotal, totals.shipping, totals.coupon + totals.pix, totals.total,
        JSON.stringify(input.address), coupon?.code ?? null, totals.coupon, input.auctionId ?? null
      ),
    // coupons has CHECK (uses_count <= max_uses) and orders has a unique (user, coupon) index,
    // so an exhausted or already-used coupon rolls the whole order back
    ...(coupon ? [db.prepare('UPDATE coupons SET uses_count = uses_count + 1 WHERE code = ?').bind(coupon.code)] : []),
    // products.stock has CHECK (stock >= 0): if a concurrent order took the last units,
    // this fails and the whole batch (order included) is rolled back
    ...[...qtyByProduct].map(([productId, qty]) =>
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').bind(qty, productId)
    ),
    // product_variants.stock has the same CHECK
    ...[...qtyByVariant].map(([variantId, qty]) =>
      db.prepare('UPDATE product_variants SET stock = stock - ? WHERE id = ?').bind(qty, variantId)
    ),
    // flash_sales has CHECK (quantity_sold <= quantity_available)
    ...[...qtyByFlashSale].map(([saleId, qty]) =>
      db.prepare('UPDATE flash_sales SET quantity_sold = quantity_sold + ? WHERE id = ?').bind(qty, saleId)
    ),
    ...lines.map(line => {
      const split = splits.get(line.productId)
      return db
        .prepare(
          `INSERT INTO order_items (id, order_id, product_id, seller_id, name, unit_price_cents, quantity, variants, flash_sale_id,
                                    stream_id, host_id, host_share_cents)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(newId(), orderId, line.productId, line.sellerId, line.name, line.unitPriceCents, line.quantity,
          line.variants ? JSON.stringify(line.variants) : null, line.flashSaleId,
          split?.streamId ?? null, split?.hostId ?? null,
          split ? Math.floor(line.unitPriceCents * line.quantity * HOST_SHARE) : null)
    }),
    // Each seller's shipment: service and price (the seller's part of the shipping)
    ...shipping.shipments.map(s =>
      db
        .prepare(
          `INSERT INTO order_shipments (order_id, seller_id, service_id, service_name, company, price_cents, delivery_days)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(orderId, s.sellerId, s.serviceId, s.serviceName, s.company, s.cents, s.days)
    ),
    // Remember the address for next time (only if it isn't saved already)
    db
      .prepare(
        `INSERT INTO addresses (id, user_id, name, street, number, complement, neighborhood, city, state, zip_code, phone, is_default)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOT EXISTS (SELECT 1 FROM addresses WHERE user_id = ?)
         WHERE NOT EXISTS (
           SELECT 1 FROM addresses WHERE user_id = ? AND zip_code = ? AND street = ? AND number = ?
         )`
      )
      .bind(
        newId(), userId, input.address.name, input.address.street, input.address.number,
        input.address.complement ?? null, input.address.neighborhood, input.address.city,
        input.address.state, input.address.zipCode, input.address.phone,
        userId, userId, input.address.zipCode, input.address.street, input.address.number
      ),
    notify(userId, 'order_update', 'Pedido recebido', `Seu pedido ${orderId} foi registrado e aguarda pagamento.`, '/orders'),
    ...(notifySellers ? [...new Set(lines.map(l => l.sellerId))] : []).map(sellerId =>
      notify(sellerId, 'order_update', 'Novo pedido', `Você recebeu o pedido ${orderId}.`, '/seller/dashboard')
    ),
    ...(notifySellers ? [...new Set([...splits.values()].map(s => s.hostId))] : []).map(hostId =>
      notify(hostId, 'order_update', 'Venda de convidado', `Um convidado vendeu na sua live (pedido ${orderId}).`, '/seller/dashboard')
    ),
  ]

  try {
    await db.batch(statements)
  } catch (e) {
    const message = String(e)
    if (message.includes('idx_orders_auction') || message.includes('orders.auction_id')) {
      throw new OrderError('INVALID', 'Este arremate já tem um pedido')
    }
    if (message.includes('idx_orders_user_coupon') || message.includes('orders.user_id, orders.coupon_code')) {
      throw new OrderError('COUPON', 'Você já usou este cupom')
    }
    if (message.includes('CHECK constraint failed') && message.includes('uses_count')) {
      throw new OrderError('COUPON', 'Este cupom esgotou')
    }
    if (message.includes('CHECK constraint failed')) {
      throw new OrderError('OUT_OF_STOCK', 'Um dos produtos acabou de esgotar')
    }
    throw e
  }

  // Lives running these flash sales show the new "units left"
  const flashIds = [...qtyByFlashSale.keys()]
  const { results: flashStreams } = flashIds.length
    ? await db
        .prepare(
          `SELECT DISTINCT stream_id FROM flash_sales WHERE stream_id IS NOT NULL AND id IN (${flashIds.map(() => '?').join(',')})`
        )
        .bind(...flashIds)
        .all<{ stream_id: string }>()
    : { results: [] }

  return { id: orderId, total: totals.total / 100, flashStreamIds: flashStreams.map(r => r.stream_id) }
}

// Cancels an order that hasn't been paid: by its buyer (userId), or because its payment
// expired. Everything the order took is given back: product and variant stock, flash sale
// units and the coupon use. (Buyers go through cancelUnpaidOrder in lib/payments.ts.)
export async function cancelOrder(orderId: string, by: { userId?: string; reason?: 'expired' } = {}) {
  const db = getDb()
  // Claiming the cancellation is one conditional UPDATE, so stock is restored at most once
  const claimed = await db
    .prepare(
      `UPDATE orders SET status = 'cancelled' WHERE id = ? AND (?2 IS NULL OR user_id = ?2) AND status = 'pending'
       RETURNING user_id`
    )
    .bind(orderId, by.userId ?? null)
    .first<{ user_id: string }>()
  if (!claimed) return false
  const userId = claimed.user_id
  const expired = by.reason === 'expired'

  const { results: sellers } = await db
    .prepare('SELECT DISTINCT seller_id FROM order_items WHERE order_id = ?')
    .bind(orderId)
    .all<{ seller_id: string }>()
  await db.batch([
    ...releaseOrder(orderId),
    notify(
      userId, 'order_update', 'Pedido cancelado',
      expired ? `O prazo para pagar o pedido ${orderId} acabou e ele foi cancelado.` : `Seu pedido ${orderId} foi cancelado.`,
      '/orders'
    ),
    ...sellers.map(s =>
      notify(
        s.seller_id, 'order_update', 'Pedido cancelado',
        expired ? `O pedido ${orderId} não foi pago a tempo e foi cancelado.` : `O pedido ${orderId} foi cancelado pelo comprador.`,
        '/seller/dashboard'
      )
    ),
  ])
  return true
}

// Gives back what an order took: stock and flash sale units (unless restock is false) and its coupon use
export function releaseOrder(orderId: string, { restock = true } = {}) {
  const db = getDb()
  const coupon = db
    .prepare('UPDATE coupons SET uses_count = max(0, uses_count - 1) WHERE code = (SELECT coupon_code FROM orders WHERE id = ?)')
    .bind(orderId)
  if (!restock) return [coupon]
  return [
    db
      .prepare(
        `UPDATE products SET stock = stock + (
           SELECT sum(quantity) FROM order_items WHERE order_id = ?1 AND product_id = products.id)
         WHERE id IN (SELECT product_id FROM order_items WHERE order_id = ?1)`
      )
      .bind(orderId),
    // order_items.variants holds the chosen names by type, e.g. {"size":"M","color":"Azul"}
    db
      .prepare(
        `UPDATE product_variants SET stock = stock + coalesce((
           SELECT sum(oi.quantity) FROM order_items oi
           WHERE oi.order_id = ?1 AND oi.product_id = product_variants.product_id
             AND json_extract(oi.variants, '$.' || product_variants.type) = product_variants.name), 0)
         WHERE product_id IN (SELECT product_id FROM order_items WHERE order_id = ?1)`
      )
      .bind(orderId),
    db
      .prepare(
        `UPDATE flash_sales SET quantity_sold = max(0, quantity_sold - (
           SELECT sum(quantity) FROM order_items WHERE order_id = ?1 AND flash_sale_id = flash_sales.id))
         WHERE id IN (SELECT flash_sale_id FROM order_items WHERE order_id = ?1)`
      )
      .bind(orderId),
    coupon,
  ]
}

export function notify(
  userId: string,
  type: 'stream_live' | 'order_update' | 'promotion' | 'follow' | 'message',
  title: string,
  message: string,
  actionUrl?: string,
  image?: string
) {
  return getDb()
    .prepare(
      `INSERT INTO notifications (id, user_id, type, title, message, action_url, image, email_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    // Order news also goes by e-mail (sendPendingEmails in lib/email.ts)
    .bind(newId(), userId, type, title, message, actionUrl ?? null, image ?? null, type === 'order_update' ? 'pending' : null)
}

export interface OrderSummary {
  id: string
  status: OrderStatus
  paymentMethod: PaymentMethod
  total: number
  createdAt: string
  items: { name: string; quantity: number; unitPrice: number; variants?: Record<string, string>; image?: string }[]
  // One per seller: the service chosen and, once sent, the tracking code
  shipments: { serviceName: string; company: string | null; days: number | null; trackingCode: string | null }[]
  refundStatus: RefundStatus | null
  // Boleto: Asaas page where the buyer gives the account for the refund
  refundUrl: string | null
  canRefund: boolean
}

export async function getOrders(userId: string): Promise<OrderSummary[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT o.id, o.status, o.payment_method, o.total_cents, o.created_at, o.paid_at, o.payment_ref,
              o.payment_env, o.refund_status, o.refund_url, oi.name, oi.quantity, oi.unit_price_cents, oi.variants, json_extract(p.images, '$[0]') AS image
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`
    )
    .bind(userId)
    .all<Record<string, any>>()

  const orders = new Map<string, OrderSummary>()
  const refundable = new Map<string, Parameters<typeof canRefund>[0]>()
  for (const r of results) {
    let order = orders.get(r.id)
    if (!order) {
      order = {
        id: r.id,
        status: r.status,
        paymentMethod: r.payment_method,
        total: r.total_cents / 100,
        createdAt: r.created_at,
        items: [],
        shipments: [],
        refundStatus: r.refund_status,
        refundUrl: r.refund_url,
        canRefund: false,
      }
      orders.set(r.id, order)
      if (r.payment_ref && r.payment_env === asaasEnv()) refundable.set(r.id, { status: r.status, refundStatus: r.refund_status, paid: !!r.paid_at })
    }
    order.items.push({
      name: r.name,
      quantity: r.quantity,
      unitPrice: r.unit_price_cents / 100,
      variants: r.variants ? JSON.parse(r.variants) : undefined,
      image: r.image ?? undefined,
    })
  }
  if (orders.size) {
    const ids = [...orders.keys()]
    const { results: shipments } = await getDb()
      .prepare(
        `SELECT order_id, service_name, company, delivery_days, tracking_code, shipped_at FROM order_shipments
         WHERE order_id IN (${ids.map(() => '?').join(',')})`
      )
      .bind(...ids)
      .all<{ order_id: string; service_name: string; company: string | null; delivery_days: number | null; tracking_code: string | null; shipped_at: string | null }>()
    for (const [id, order] of refundable) {
      const shippedAt = shipments.flatMap(s => (s.order_id === id && s.shipped_at ? [s.shipped_at] : [])).sort().at(-1)
      orders.get(id)!.canRefund = canRefund(order, shippedAt ?? null)
    }
    for (const s of shipments) {
      orders.get(s.order_id)?.shipments.push({
        serviceName: s.service_name,
        company: s.company,
        days: s.delivery_days,
        trackingCode: s.tracking_code,
      })
    }
  }
  return [...orders.values()]
}

export async function getDefaultAddress(userId: string): Promise<Address | null> {
  const r = await getDb()
    .prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, rowid DESC LIMIT 1')
    .bind(userId)
    .first<Record<string, any>>()
  return r ? toAddress(r) : null
}
