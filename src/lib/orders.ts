import 'server-only'
import { getDb } from './db'
import { checkCoupon } from './coupons'
import { toAddress } from './addresses'
import { computeTotals, VARIANT_TYPES, type AppliedCoupon } from './pricing'
import type { Address, OrderStatus, PaymentMethod } from '@/types'

export type NewAddress = Omit<Address, 'id' | 'isDefault'>

export interface NewOrderInput {
  items: { productId: string; quantity: number; variants?: Record<string, string> }[]
  paymentMethod: Extract<PaymentMethod, 'pix' | 'credit_card' | 'boleto'>
  address: NewAddress
  couponCode?: string
}

export class OrderError extends Error {
  constructor(public code: 'EMPTY' | 'NOT_FOUND' | 'OUT_OF_STOCK' | 'INVALID' | 'COUPON', message: string) {
    super(message)
  }
}

const newId = () => crypto.randomUUID()
const orderNumber = () => `VB-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`

export async function createOrder(userId: string, input: NewOrderInput) {
  const db = getDb()
  if (input.items.length === 0) throw new OrderError('EMPTY', 'Carrinho vazio')

  // Merge duplicate lines of the same product/variant
  const lines = new Map<string, NewOrderInput['items'][number]>()
  for (const item of input.items) {
    const key = `${item.productId}|${VARIANT_TYPES.map(t => item.variants?.[t] ?? '').join('|')}`
    const prev = lines.get(key)
    lines.set(key, prev ? { ...prev, quantity: prev.quantity + item.quantity } : { ...item })
  }

  const ids = [...new Set(input.items.map(i => i.productId))]
  const { results: products } = await db
    .prepare(
      `SELECT id, seller_id, name, price_cents, stock FROM products
       WHERE is_active = 1 AND id IN (${ids.map(() => '?').join(',')})`
    )
    .bind(...ids)
    .all<{ id: string; seller_id: string; name: string; price_cents: number; stock: number }>()
  const byId = new Map(products.map(p => [p.id, p]))
  const { results: variantRows } = await db
    .prepare(
      `SELECT id, product_id, type, name, stock, price_modifier_cents FROM product_variants
       WHERE product_id IN (${ids.map(() => '?').join(',')})`
    )
    .bind(...ids)
    .all<{ id: string; product_id: string; type: string; name: string; stock: number; price_modifier_cents: number }>()

  // Prices always come from the database, never from the client
  let subtotal = 0
  const qtyByProduct = new Map<string, number>()
  const qtyByVariant = new Map<string, number>()
  const priced = new Map<string, { unitPriceCents: number; variants: Record<string, string> | null }>()
  for (const [key, line] of lines) {
    const product = byId.get(line.productId)
    if (!product) throw new OrderError('NOT_FOUND', 'Produto indisponível')

    // Each variant type the product offers must be chosen, and only those
    const offered = variantRows.filter(v => v.product_id === product.id)
    const chosen = Object.entries(line.variants ?? {})
    if (chosen.some(([type]) => !offered.some(v => v.type === type))) {
      throw new OrderError('INVALID', `Opção inválida: ${product.name}`)
    }
    let unitPriceCents = product.price_cents
    const variants: Record<string, string> = {}
    for (const type of VARIANT_TYPES) {
      if (!offered.some(v => v.type === type)) continue
      const v = offered.find(v => v.type === type && v.name === line.variants?.[type])
      if (!v) throw new OrderError('INVALID', `Escolha as opções de ${product.name}`)
      unitPriceCents += v.price_modifier_cents
      variants[type] = v.name
      qtyByVariant.set(v.id, (qtyByVariant.get(v.id) ?? 0) + line.quantity)
    }

    priced.set(key, { unitPriceCents, variants: Object.keys(variants).length ? variants : null })
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

  let coupon: AppliedCoupon | null = null
  if (input.couponCode) {
    const check = await checkCoupon(input.couponCode, userId, subtotal)
    if (!check.ok) throw new OrderError('COUPON', check.message)
    coupon = check.coupon
  }

  const totals = computeTotals(subtotal, { coupon, pix: input.paymentMethod === 'pix' })

  const orderId = orderNumber()
  const statements = [
    db
      .prepare(
        `INSERT INTO orders (id, user_id, status, payment_method, subtotal_cents, shipping_cents,
                             discount_cents, total_cents, shipping_address, coupon_code, coupon_discount_cents)
         VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        orderId, userId, input.paymentMethod, subtotal, totals.shipping, totals.coupon + totals.pix, totals.total,
        JSON.stringify(input.address), coupon?.code ?? null, totals.coupon
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
    ...[...lines].map(([key, line]) => {
      const p = byId.get(line.productId)!
      const { unitPriceCents, variants } = priced.get(key)!
      return db
        .prepare(
          `INSERT INTO order_items (id, order_id, product_id, seller_id, name, unit_price_cents, quantity, variants)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(newId(), orderId, p.id, p.seller_id, p.name, unitPriceCents, line.quantity,
          variants ? JSON.stringify(variants) : null)
    }),
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
    ...[...new Set(products.map(p => p.seller_id))].map(sellerId =>
      notify(sellerId, 'order_update', 'Novo pedido', `Você recebeu o pedido ${orderId}.`, '/seller/dashboard')
    ),
  ]

  try {
    await db.batch(statements)
  } catch (e) {
    const message = String(e)
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

  return { id: orderId, total: totals.total / 100 }
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
      `INSERT INTO notifications (id, user_id, type, title, message, action_url, image) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(newId(), userId, type, title, message, actionUrl ?? null, image ?? null)
}

export interface OrderSummary {
  id: string
  status: OrderStatus
  paymentMethod: PaymentMethod
  total: number
  createdAt: string
  items: { name: string; quantity: number; unitPrice: number; variants?: Record<string, string>; image?: string }[]
}

export async function getOrders(userId: string): Promise<OrderSummary[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT o.id, o.status, o.payment_method, o.total_cents, o.created_at,
              oi.name, oi.quantity, oi.unit_price_cents, oi.variants, json_extract(p.images, '$[0]') AS image
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`
    )
    .bind(userId)
    .all<Record<string, any>>()

  const orders = new Map<string, OrderSummary>()
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
      }
      orders.set(r.id, order)
    }
    order.items.push({
      name: r.name,
      quantity: r.quantity,
      unitPrice: r.unit_price_cents / 100,
      variants: r.variants ? JSON.parse(r.variants) : undefined,
      image: r.image ?? undefined,
    })
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
