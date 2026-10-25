import 'server-only'
import { getDb } from './db'
import { getSession } from './auth'
import { notify } from './orders'

const newId = () => crypto.randomUUID()
const cents = (reais: number) => Math.round(reais * 100)

// Returns the signed-in seller's id, or a Response to send back
export async function requireSeller(): Promise<string | Response> {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  const row = await getDb().prepare('SELECT is_seller FROM users WHERE id = ?').bind(session.user.id).first<{ is_seller: number }>()
  if (!row?.is_seller) return new Response('Forbidden', { status: 403 })
  return session.user.id
}

// ---------- Products ----------

export interface ProductInput {
  name: string
  description: string
  price: number
  originalPrice?: number
  stock: number
  category: string
  images: string[]
  tags: string[]
}

export async function createProduct(sellerId: string, p: ProductInput) {
  const id = newId()
  await getDb()
    .prepare(
      `INSERT INTO products (id, seller_id, category_slug, name, description, price_cents, original_price_cents, stock, images, tags)
       VALUES (?, ?, (SELECT slug FROM categories WHERE slug = ?), ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, sellerId, p.category, p.name, p.description, cents(p.price),
      p.originalPrice ? cents(p.originalPrice) : null, p.stock, JSON.stringify(p.images), JSON.stringify(p.tags)
    )
    .run()
  return id
}

export async function updateProduct(
  sellerId: string,
  productId: string,
  patch: { price?: number; stock?: number; isActive?: boolean }
) {
  const result = await getDb()
    .prepare(
      `UPDATE products SET
         price_cents = coalesce(?, price_cents),
         stock = coalesce(?, stock),
         is_active = coalesce(?, is_active)
       WHERE id = ? AND seller_id = ?`
    )
    .bind(
      patch.price === undefined ? null : cents(patch.price),
      patch.stock ?? null,
      patch.isActive === undefined ? null : patch.isActive ? 1 : 0,
      productId,
      sellerId
    )
    .run()
  return result.meta.changes > 0
}

// ---------- Streams ----------

export interface StreamInput {
  title: string
  description: string
  category: string
  scheduledAt: string
  thumbnail?: string
  productIds: string[]
  tags: string[]
}

export async function createStream(sellerId: string, s: StreamInput) {
  const db = getDb()
  const id = newId()
  // Only the seller's own active products can be attached
  const { results: owned } = s.productIds.length
    ? await db
        .prepare(
          `SELECT id FROM products WHERE seller_id = ? AND is_active = 1
           AND id IN (${s.productIds.map(() => '?').join(',')})`
        )
        .bind(sellerId, ...s.productIds)
        .all<{ id: string }>()
    : { results: [] }
  const ownedIds = new Set(owned.map(r => r.id))

  await db.batch([
    db
      .prepare(
        `INSERT INTO streams (id, host_id, category_slug, title, description, thumbnail, status, scheduled_at, tags)
         VALUES (?, ?, (SELECT slug FROM categories WHERE slug = ?), ?, ?, ?, 'scheduled', ?, ?)`
      )
      .bind(id, sellerId, s.category, s.title, s.description, s.thumbnail ?? null, s.scheduledAt, JSON.stringify(s.tags)),
    ...s.productIds
      .filter(pid => ownedIds.has(pid))
      .map((pid, i) => db.prepare('INSERT INTO stream_products (stream_id, product_id, sort_order) VALUES (?, ?, ?)').bind(id, pid, i)),
  ])
  return id
}

// Going live notifies every follower; ending closes the stream
export async function setStreamStatus(sellerId: string, streamId: string, status: 'live' | 'ended') {
  const db = getDb()
  const stream = await db
    .prepare(
      `SELECT s.id, s.title, s.status, u.name AS host_name, u.avatar AS host_avatar
       FROM streams s JOIN users u ON u.id = s.host_id WHERE s.id = ? AND s.host_id = ?`
    )
    .bind(streamId, sellerId)
    .first<{ id: string; title: string; status: string; host_name: string; host_avatar: string | null }>()
  if (!stream) return false
  if (stream.status === status || stream.status === 'ended') return true

  if (status === 'live') {
    const { results: followers } = await db
      .prepare('SELECT follower_id FROM follows WHERE followee_id = ?')
      .bind(sellerId)
      .all<{ follower_id: string }>()
    await db.batch([
      db
        .prepare(`UPDATE streams SET status = 'live', started_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`)
        .bind(streamId),
      ...followers.map(f =>
        notify(f.follower_id, 'stream_live', `${stream.host_name} está ao vivo!`, stream.title, `/live/${streamId}`, stream.host_avatar ?? undefined)
      ),
    ])
  } else {
    await db
      .prepare(
        `UPDATE streams SET status = 'ended', viewer_count = 0, ended_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`
      )
      .bind(streamId)
      .run()
  }
  return true
}

// ---------- Auctions ----------

export interface AuctionInput {
  productId: string
  startingPrice: number
  minimumIncrement: number
  durationMinutes: number
  startsAt: string
  streamId?: string
}

export async function createAuction(sellerId: string, a: AuctionInput) {
  const db = getDb()
  const owns = await db
    .prepare('SELECT 1 FROM products WHERE id = ? AND seller_id = ? AND is_active = 1')
    .bind(a.productId, sellerId)
    .first()
  if (!owns) return null
  const streamOk = a.streamId
    ? await db.prepare('SELECT 1 FROM streams WHERE id = ? AND host_id = ?').bind(a.streamId, sellerId).first()
    : true

  const id = newId()
  const start = new Date(a.startsAt)
  const end = new Date(start.getTime() + a.durationMinutes * 60_000)
  await db
    .prepare(
      `INSERT INTO auctions (id, product_id, stream_id, starting_price_cents, current_bid_cents, minimum_increment_cents,
                             starts_at, ends_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, a.productId, streamOk ? a.streamId ?? null : null, cents(a.startingPrice), cents(a.startingPrice),
      cents(a.minimumIncrement), start.toISOString(), end.toISOString(), start <= new Date() ? 'active' : 'upcoming'
    )
    .run()
  return id
}
