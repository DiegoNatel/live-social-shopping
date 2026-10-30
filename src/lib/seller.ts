import 'server-only'
import { getDb } from './db'
import { getSession } from './auth'
import { notify } from './orders'
import { canSellInStream } from './guests'
import { openVideoRoom, closeVideoRoom } from './video'
import { END_STREAM_SQL } from './livekit'
import { interestsForLive } from './interests'

const newId = () => crypto.randomUUID()
// Users told about a live because of their interests (followers are always told)
const INTERESTED_LIMIT = 500
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
  variants: { type: 'size' | 'color'; name: string; value: string; stock: number; priceModifier: number }[]
  // Shipping package; null values use DEFAULT_PACKAGE in lib/shipping.ts
  package?: { weightG: number | null; heightCm: number | null; widthCm: number | null; lengthCm: number | null }
}

export async function createProduct(sellerId: string, p: ProductInput) {
  const db = getDb()
  const id = newId()
  await db.batch([
    db
      .prepare(
        `INSERT INTO products (id, seller_id, category_slug, name, description, price_cents, original_price_cents, stock, images, tags,
                               weight_g, height_cm, width_cm, length_cm)
         VALUES (?, ?, (SELECT slug FROM categories WHERE slug = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id, sellerId, p.category, p.name, p.description, cents(p.price),
        p.originalPrice ? cents(p.originalPrice) : null, p.stock, JSON.stringify(p.images), JSON.stringify(p.tags),
        p.package?.weightG ?? null, p.package?.heightCm ?? null, p.package?.widthCm ?? null, p.package?.lengthCm ?? null
      ),
    ...p.variants.map((v, i) =>
      db
        .prepare(
          `INSERT INTO product_variants (id, product_id, type, name, value, stock, price_modifier_cents, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(newId(), id, v.type, v.name, v.value, v.stock, cents(v.priceModifier), i)
    ),
  ])
  return id
}

export async function updateProduct(
  sellerId: string,
  productId: string,
  patch: { price?: number; stock?: number; isActive?: boolean }
): Promise<'ok' | 'not_found' | 'price_too_low'> {
  const db = getDb()
  // A cheaper variant (negative modifier) must still cost at least R$ 0,01
  if (patch.price !== undefined) {
    const lowest = await db
      .prepare('SELECT coalesce(min(price_modifier_cents), 0) AS m FROM product_variants WHERE product_id = ?')
      .bind(productId)
      .first<number>('m')
    if (cents(patch.price) + Math.min(lowest ?? 0, 0) < 1) return 'price_too_low'
  }
  const result = await db
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
  return result.meta.changes > 0 ? 'ok' : 'not_found'
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

// Going live notifies every follower, and users whose interests match the live's category
// or hashtags (at most INTERESTED_LIMIT of them); ending closes the stream
export async function setStreamStatus(sellerId: string, streamId: string, status: 'live' | 'ended') {
  const db = getDb()
  const stream = await db
    .prepare(
      `SELECT s.id, s.title, s.status, s.category_slug, s.tags, u.name AS host_name, u.avatar AS host_avatar
       FROM streams s JOIN users u ON u.id = s.host_id WHERE s.id = ? AND s.host_id = ?`
    )
    .bind(streamId, sellerId)
    .first<{
      id: string
      title: string
      status: string
      category_slug: string | null
      tags: string | null
      host_name: string
      host_avatar: string | null
    }>()
  if (!stream) return false
  if (stream.status === status || stream.status === 'ended') return true

  if (status === 'live') {
    // A video service outage shouldn't stop the live: chat, bids and sales still work
    const room = await openVideoRoom(streamId).catch(e => {
      console.error('Could not open the video room', streamId, e)
      return null
    })
    const { results: followers } = await db
      .prepare('SELECT follower_id FROM follows WHERE followee_id = ?')
      .bind(sellerId)
      .all<{ follower_id: string }>()
    const interests = interestsForLive(stream.category_slug ?? '', JSON.parse(stream.tags ?? '[]') as string[])
    const { results: interested } = interests.length
      ? await db
          .prepare(
            `SELECT u.id FROM users u
             WHERE u.id != ?1
               AND NOT EXISTS (SELECT 1 FROM follows f WHERE f.followee_id = ?1 AND f.follower_id = u.id)
               AND EXISTS (SELECT 1 FROM json_each(u.interests) j WHERE j.value IN (${interests.map(() => '?').join(',')}))
             LIMIT ${INTERESTED_LIMIT}`
          )
          .bind(sellerId, ...interests)
          .all<{ id: string }>()
      : { results: [] }
    await db.batch([
      db
        .prepare(
          `UPDATE streams SET status = 'live', started_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
             recording_key = ?, video_room = ?, video_idle_since = NULL
           WHERE id = ?`
        )
        .bind(room?.recordingKey ?? null, room ? 1 : 0, streamId),
      ...followers.map(f =>
        notify(f.follower_id, 'stream_live', `${stream.host_name} está ao vivo!`, stream.title, `/live/${streamId}`, stream.host_avatar ?? undefined)
      ),
      ...interested.map(u =>
        notify(u.id, 'stream_live', `Ao vivo agora, do seu interesse`, `${stream.host_name}: ${stream.title}`, `/live/${streamId}`, stream.host_avatar ?? undefined)
      ),
    ])
  } else {
    await db.prepare(END_STREAM_SQL).bind(streamId).run()
    closeVideoRoom(streamId)
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

// Returns the new auction's id, NOT_FOUND for a product that isn't the seller's, or
// STREAM_FORBIDDEN for a live the seller neither hosts nor was accepted into as a guest
export async function createAuction(sellerId: string, a: AuctionInput): Promise<string | 'NOT_FOUND' | 'STREAM_FORBIDDEN'> {
  const db = getDb()
  const owns = await db
    .prepare('SELECT 1 FROM products WHERE id = ? AND seller_id = ? AND is_active = 1')
    .bind(a.productId, sellerId)
    .first()
  if (!owns) return 'NOT_FOUND'
  if (a.streamId && !(await canSellInStream(sellerId, a.streamId))) return 'STREAM_FORBIDDEN'

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
      id, a.productId, a.streamId ?? null, cents(a.startingPrice), cents(a.startingPrice),
      cents(a.minimumIncrement), start.toISOString(), end.toISOString(), start <= new Date() ? 'active' : 'upcoming'
    )
    .run()
  return id
}
