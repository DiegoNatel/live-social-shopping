import 'server-only'
import { getDb } from './db'

// Live tools for a stream's host. Every function checks that the seller hosts the stream
// and returns false when they don't (or the input doesn't belong to them).

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
const newId = () => crypto.randomUUID()

async function hostsStream(sellerId: string, streamId: string) {
  return !!(await getDb()
    .prepare(`SELECT 1 FROM streams WHERE id = ? AND host_id = ? AND status != 'ended'`)
    .bind(streamId, sellerId)
    .first())
}

async function ownsActiveProduct(sellerId: string, productId: string) {
  return getDb()
    .prepare('SELECT stock FROM products WHERE id = ? AND seller_id = ? AND is_active = 1')
    .bind(productId, sellerId)
    .first<{ stock: number }>()
}

// A new poll replaces the running one
export async function startPoll(sellerId: string, streamId: string, question: string, options: string[], durationMinutes?: number) {
  if (!(await hostsStream(sellerId, streamId))) return false
  const db = getDb()
  const pollId = newId()
  const endsAt = durationMinutes ? new Date(Date.now() + durationMinutes * 60_000).toISOString() : null
  await db.batch([
    db.prepare('UPDATE polls SET is_active = 0 WHERE stream_id = ?').bind(streamId),
    db.prepare('INSERT INTO polls (id, stream_id, question, ends_at) VALUES (?, ?, ?, ?)').bind(pollId, streamId, question, endsAt),
    ...options.map((text, i) =>
      db.prepare('INSERT INTO poll_options (id, poll_id, text, sort_order) VALUES (?, ?, ?, ?)').bind(newId(), pollId, text, i)
    ),
  ])
  return true
}

export async function endPoll(sellerId: string, streamId: string) {
  if (!(await hostsStream(sellerId, streamId))) return false
  await getDb().prepare('UPDATE polls SET is_active = 0 WHERE stream_id = ?').bind(streamId).run()
  return true
}

export type FlashSaleResult = 'ok' | 'forbidden' | 'not_enough_stock' | 'on_sale_elsewhere'

// A new flash sale replaces the one running in this stream
export async function startFlashSale(
  sellerId: string,
  streamId: string,
  s: { productId: string; discountPercent: number; durationMinutes: number; quantity: number }
): Promise<FlashSaleResult> {
  const [isHost, product] = await Promise.all([hostsStream(sellerId, streamId), ownsActiveProduct(sellerId, s.productId)])
  if (!isHost || !product) return 'forbidden'
  if (s.quantity > product.stock) return 'not_enough_stock'
  const db = getDb()
  // Prices use one running sale per product, so a product can't be on sale in two lives at once
  const elsewhere = await db
    .prepare(`SELECT 1 FROM flash_sales WHERE product_id = ? AND stream_id IS NOT ? AND starts_at <= ${NOW} AND ends_at > ${NOW}`)
    .bind(s.productId, streamId)
    .first()
  if (elsewhere) return 'on_sale_elsewhere'
  const endsAt = new Date(Date.now() + s.durationMinutes * 60_000).toISOString()
  await db.batch([
    db.prepare(`UPDATE flash_sales SET ends_at = ${NOW} WHERE stream_id = ? AND ends_at > ${NOW}`).bind(streamId),
    db
      .prepare(
        `INSERT INTO flash_sales (id, product_id, stream_id, discount_percent, starts_at, ends_at, quantity_available)
         VALUES (?, ?, ?, ?, ${NOW}, ?, ?)`
      )
      .bind(newId(), s.productId, streamId, s.discountPercent, endsAt, s.quantity),
  ])
  return 'ok'
}

export async function endFlashSale(sellerId: string, streamId: string) {
  if (!(await hostsStream(sellerId, streamId))) return false
  await getDb().prepare(`UPDATE flash_sales SET ends_at = ${NOW} WHERE stream_id = ? AND ends_at > ${NOW}`).bind(streamId).run()
  return true
}

// A guest seller's product the host can show because it's featured in the live
async function featuredInStream(streamId: string, productId: string) {
  return getDb()
    .prepare(
      `SELECT 1 FROM stream_products sp JOIN products p ON p.id = sp.product_id
       WHERE sp.stream_id = ? AND sp.product_id = ? AND p.is_active = 1`
    )
    .bind(streamId, productId)
    .first()
}

// productId null unpins. The host can pin their own products and any featured in the live.
export async function pinProduct(sellerId: string, streamId: string, productId: string | null) {
  const [isHost, product] = await Promise.all([
    hostsStream(sellerId, streamId),
    productId
      ? ownsActiveProduct(sellerId, productId).then(own => own ?? featuredInStream(streamId, productId))
      : Promise.resolve(true),
  ])
  if (!isHost || !product) return false
  await getDb().prepare('UPDATE streams SET pinned_product_id = ? WHERE id = ?').bind(productId, streamId).run()
  return true
}
