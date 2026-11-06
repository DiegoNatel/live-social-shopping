import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { User, Product, ProductVariant, Stream, Category, Auction, AuctionBid } from '@/types'
import { normalizeTag } from './interests'
import { missingSetup, setupCols } from './seller-setup'

export function getDb(): D1Database {
  return getCloudflareContext().env.DB
}

// ---------- Row → type mappers ----------

const fromCents = (c: number | null | undefined) => (c == null ? undefined : c / 100)
const parseList = (v: string | null | undefined): string[] => (v ? JSON.parse(v) : [])

// Columns for a user joined under a prefix, e.g. userCols('u', 'seller_')
const userCols = (alias: string, prefix: string) =>
  ['id', 'name', 'username', 'avatar', 'bio', 'is_verified', 'followers_count', 'following_count']
    .map(c => `${alias}.${c} AS ${prefix}${c}`)
    .join(', ')

type Row = Record<string, any>

function toUser(row: Row, prefix = ''): User {
  return {
    id: row[`${prefix}id`],
    name: row[`${prefix}name`],
    username: row[`${prefix}username`],
    avatar: row[`${prefix}avatar`] ?? '',
    bio: row[`${prefix}bio`] ?? undefined,
    isVerified: !!row[`${prefix}is_verified`],
    followers: row[`${prefix}followers_count`],
    following: row[`${prefix}following_count`],
  }
}

function toProduct(row: Row, variants: ProductVariant[] = []): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: fromCents(row.price_cents)!,
    originalPrice: fromCents(row.original_price_cents),
    images: parseList(row.images),
    category: row.category_slug,
    variants,
    stock: row.stock,
    // Stored unrounded (reviews update it incrementally)
    rating: Math.round(row.rating * 10) / 10,
    reviews: row.reviews_count,
    seller: toUser(row, 'seller_'),
    tags: parseList(row.tags),
    itemType: 'product',
    isActive: row.is_active === undefined ? undefined : !!row.is_active,
    isBlocked: !!row.blocked_at,
    // Only in buyer-facing lists (they select the seller's set-up columns)
    sellerReady:
      row.seller_has_wallet === undefined
        ? undefined
        : missingSetup({ shipFromZip: row.seller_ship_from_zip, hasWallet: !!row.seller_has_wallet }).length === 0,
  }
}

// ---------- Products ----------

const PRODUCT_SELECT = `
  SELECT p.*, ${userCols('u', 'seller_')}, ${setupCols('u', 'seller_')}
  FROM products p JOIN users u ON u.id = p.seller_id
  WHERE p.is_active = 1`

async function variantsFor(ids: string[]): Promise<Map<string, ProductVariant[]>> {
  const map = new Map<string, ProductVariant[]>()
  if (ids.length === 0) return map
  const { results } = await getDb()
    .prepare(
      `SELECT * FROM product_variants WHERE product_id IN (${ids.map(() => '?').join(',')}) ORDER BY sort_order`
    )
    .bind(...ids)
    .all<Row>()
  for (const v of results) {
    const list = map.get(v.product_id) ?? []
    list.push({
      id: v.id,
      type: v.type,
      name: v.name,
      value: v.value,
      stock: v.stock,
      priceModifier: v.price_modifier_cents ? fromCents(v.price_modifier_cents) : undefined,
    })
    map.set(v.product_id, list)
  }
  return map
}

export interface ActiveFlashSale {
  id: string
  productId: string
  discountPercent: number
  endsAt: string
  remaining: number
}

// Running flash sales with units left, the biggest discount per product.
// The order API uses the same function, so the price shown is the price charged.
export async function activeFlashSales(productIds: string[]): Promise<Map<string, ActiveFlashSale>> {
  const map = new Map<string, ActiveFlashSale>()
  if (productIds.length === 0) return map
  const now = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
  const { results } = await getDb()
    .prepare(
      `SELECT id, product_id, discount_percent, ends_at, quantity_available - quantity_sold AS remaining
       FROM flash_sales
       WHERE product_id IN (${productIds.map(() => '?').join(',')})
         AND starts_at <= ${now} AND ends_at > ${now} AND quantity_sold < quantity_available
       ORDER BY discount_percent DESC`
    )
    .bind(...productIds)
    .all<Row>()
  for (const r of results) {
    if (map.has(r.product_id)) continue
    map.set(r.product_id, {
      id: r.id,
      productId: r.product_id,
      discountPercent: r.discount_percent,
      endsAt: r.ends_at,
      remaining: r.remaining,
    })
  }
  return map
}

export const flashPriceCents = (priceCents: number, discountPercent: number) =>
  Math.round((priceCents * (100 - discountPercent)) / 100)

async function hydrateProducts(rows: Row[]): Promise<Product[]> {
  const ids = rows.map(r => r.id)
  const [variants, flash] = await Promise.all([variantsFor(ids), activeFlashSales(ids)])
  return rows.map(r => {
    const product = toProduct(r, variants.get(r.id))
    const sale = flash.get(r.id)
    if (!sale) return product
    return {
      ...product,
      price: flashPriceCents(r.price_cents, sale.discountPercent) / 100,
      // Strike through the regular price (or the list price, if higher)
      originalPrice: Math.max(r.price_cents, r.original_price_cents ?? 0) / 100,
      flashSale: {
        id: sale.id,
        discountPercent: sale.discountPercent,
        endsAt: sale.endsAt,
        remaining: sale.remaining,
        regularPrice: r.price_cents / 100,
      },
    }
  })
}

const PRODUCT_ORDER = {
  default: 'p.created_at, p.id',
  // Biggest discount first
  discount: '(p.original_price_cents - p.price_cents) * 1.0 / p.original_price_cents DESC, p.id',
  // Units ordered in the last 30 days, then rating weighted by review count
  trending: `(SELECT coalesce(sum(oi.quantity), 0) FROM order_items oi JOIN orders o ON o.id = oi.order_id
              WHERE oi.product_id = p.id AND o.status != 'cancelled'
                AND o.created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days')) DESC,
             p.rating * p.reviews_count DESC, p.id`,
}

// category: only products of that category slug
export async function getProducts({
  onSale = false,
  inStock = false,
  sort = 'default' as keyof typeof PRODUCT_ORDER,
  limit = 20,
  category,
}: { onSale?: boolean; inStock?: boolean; sort?: keyof typeof PRODUCT_ORDER; limit?: number; category?: string } = {}): Promise<Product[]> {
  const { results } = await getDb()
    .prepare(
      `${PRODUCT_SELECT} ${onSale ? 'AND p.original_price_cents > p.price_cents' : ''} ${inStock ? 'AND p.stock > 0' : ''}
       ${category ? 'AND p.category_slug = ?' : ''}
       ORDER BY ${PRODUCT_ORDER[sort]} LIMIT ?`
    )
    .bind(...(category ? [category] : []), limit)
    .all<Row>()
  const products = await hydrateProducts(results)
  // Flash sales lower the price after the query, so sort again by the discount the buyer sees
  if (sort === 'discount') {
    const off = (p: Product) => (p.originalPrice ? (p.originalPrice - p.price) / p.originalPrice : 0)
    products.sort((a, b) => off(b) - off(a))
  }
  return products
}

export async function getFavoriteProducts(userId: string): Promise<Product[]> {
  const { results } = await getDb()
    .prepare(
      `${PRODUCT_SELECT} AND p.id IN (SELECT product_id FROM favorites WHERE user_id = ?)
       ORDER BY (SELECT created_at FROM favorites WHERE user_id = ? AND product_id = p.id) DESC`
    )
    .bind(userId, userId)
    .all<Row>()
  return hydrateProducts(results)
}

// ---------- Search ----------

// Lowercase without accents: "TÊNIS" and "tenis" both become "tenis"
const fold = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// The search words without accents, and without a plural "s" ("vestidos" finds "vestido")
function searchWords(q: string) {
  return fold(q.replace(/^#+/, ''))
    .split(/\s+/)
    .filter(Boolean)
    .map(w => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
}

// SQLite's LIKE ignores case only for A–Z, and never accents. Each letter that can carry an accent
// becomes the one-character wildcard, so "t_n_" finds "tênis"; matches are then checked exactly in JS.
// The user's %, _ and \ are escaped.
const likePattern = (word: string) =>
  `%${word.replace(/[\\%_]/g, c => `\\${c}`).replace(/[aeiouc]/g, '_')}%`

const matchesAll = (words: string[], ...fields: (string | null | undefined)[]) => {
  const text = fold(fields.filter(Boolean).join(' '))
  return words.every(w => text.includes(w))
}

export async function search(q: string) {
  const db = getDb()
  const words = searchWords(q)
  if (words.length === 0) return { products: [], sellers: [], streams: [] }
  // Every word has to appear somewhere in the product (name, description, tags or category)
  const productWhere = words
    .map((_, i) => `(p.name LIKE ?${i + 1} ESCAPE '\\' OR p.description LIKE ?${i + 1} ESCAPE '\\' OR p.tags LIKE ?${i + 1} ESCAPE '\\' OR p.category_slug LIKE ?${i + 1} ESCAPE '\\')`)
    .join(' AND ')
  const sellerWhere = words
    .map((_, i) => `(name LIKE ?${i + 1} ESCAPE '\\' OR username LIKE ?${i + 1} ESCAPE '\\')`)
    .join(' AND ')
  const patterns = words.map(likePattern)
  const [{ results: productRows }, { results: sellerRows }, streams] = await Promise.all([
    db
      .prepare(`${PRODUCT_SELECT} AND ${productWhere} ORDER BY p.reviews_count DESC LIMIT 80`)
      .bind(...patterns)
      .all<Row>(),
    db
      .prepare(`SELECT * FROM users WHERE is_seller = 1 AND ${sellerWhere} ORDER BY followers_count DESC LIMIT 20`)
      .bind(...patterns)
      .all<Row>(),
    // Live now, scheduled, and recordings
    Promise.all([getStreams({ live: true }), getStreams({ live: false, upcoming: true }), getStreams({ live: false, ended: true, recorded: true })]),
  ])
  const matchedProducts = productRows
    .filter(r => matchesAll(words, r.name as string, r.description as string, r.tags as string, r.category_slug as string))
    // Name matches first
    .sort((a, b) => Number(matchesAll(words, b.name as string)) - Number(matchesAll(words, a.name as string)))
    .slice(0, 40)
  return {
    products: await hydrateProducts(matchedProducts),
    sellers: sellerRows
      .filter(r => matchesAll(words, r.name as string, r.username as string))
      .slice(0, 10)
      .map(r => toUser(r)),
    streams: streams
      .flat()
      .filter(s => matchesAll(words, s.title, s.host.name, s.category, s.tags.map(normalizeTag).join(' ')))
      .slice(0, 12),
  }
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return []
  const { results } = await getDb()
    .prepare(`${PRODUCT_SELECT} AND p.id IN (${ids.map(() => '?').join(',')})`)
    .bind(...ids)
    .all<Row>()
  return hydrateProducts(results)
}

// ---------- Streams ----------

// Live streams (most viewers first) or scheduled ones (soonest first), optionally for one host or one id.
// ended: the latest finished lives instead (whose recording, if any, is in videoUrl);
// recorded: only those with a recording; category: only lives of that category slug
export async function getStreams({
  live,
  ended,
  recorded,
  hostId,
  id,
  category,
  upcoming,
}: {
  live: boolean
  // Scheduled lives whose time hasn't passed (an hour of grace for a late start)
  upcoming?: boolean
  ended?: boolean
  recorded?: boolean
  hostId?: string
  id?: string
  category?: string
}): Promise<Stream[]> {
  const db = getDb()
  const filters = [
    hostId ? 'AND s.host_id = ?' : '',
    id ? 'AND s.id = ?' : '',
    recorded ? 'AND s.video_url IS NOT NULL' : '',
    category ? 'AND s.category_slug = ?' : '',
    upcoming ? "AND (s.scheduled_at IS NULL OR s.scheduled_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 hour'))" : '',
  ].join(' ')
  const { results: rows } = await db
    .prepare(
      `SELECT s.*, ${userCols('u', 'host_')}
       FROM streams s JOIN users u ON u.id = s.host_id
       WHERE s.status ${ended ? "= 'ended'" : live ? "= 'live'" : "= 'scheduled'"} AND s.blocked_at IS NULL ${filters}
       ORDER BY ${ended ? 's.ended_at DESC LIMIT 20' : live ? 's.viewer_count DESC' : 's.scheduled_at'}`
    )
    .bind(...[hostId, id, category].filter((v): v is string => !!v))
    .all<Row>()
  if (rows.length === 0) return []

  const ids = rows.map(r => r.id)
  const { results: links } = await db
    .prepare(
      `SELECT sp.stream_id, p.*, ${userCols('u', 'seller_')}
       FROM stream_products sp
       JOIN products p ON p.id = sp.product_id
       JOIN users u ON u.id = p.seller_id
       WHERE sp.stream_id IN (${ids.map(() => '?').join(',')})
       ORDER BY sp.sort_order`
    )
    .bind(...ids)
    .all<Row>()
  const products = await hydrateProducts(links)
  const byStream = new Map<string, Product[]>()
  links.forEach((l, i) => byStream.set(l.stream_id, [...(byStream.get(l.stream_id) ?? []), products[i]]))

  return rows.map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    host: toUser(r, 'host_'),
    thumbnail: r.thumbnail || byStream.get(r.id)?.[0]?.images[0] || '/icon.png',
    videoUrl: r.video_url ?? undefined,
    isLive: r.status === 'live',
    hasEnded: r.status === 'ended',
    endedAt: r.ended_at ?? undefined,
    viewerCount: r.viewer_count,
    startTime: r.started_at ?? r.scheduled_at ?? '',
    scheduledTime: r.scheduled_at ?? undefined,
    category: r.category_slug,
    products: byStream.get(r.id) ?? [],
    tags: parseList(r.tags),
    likes: r.likes,
    pinnedProductId: r.pinned_product_id ?? undefined,
  }))
}

// ---------- Single stream ----------

export async function getStream(id: string): Promise<Stream | null> {
  const [live, scheduled, ended] = await Promise.all([
    getStreams({ live: true, id }),
    getStreams({ live: false, id }),
    getStreams({ live: false, ended: true, id }),
  ])
  return live[0] ?? scheduled[0] ?? ended[0] ?? null
}

// ---------- Categories ----------

// Product categories. Courses are off for now (the tables and the 'courses' category stay)
export async function getCategories(): Promise<Category[]> {
  const { results } = await getDb().prepare("SELECT * FROM categories WHERE slug != 'courses' ORDER BY sort_order").all<Row>()
  return results.map(r => ({ id: r.id, name: r.name, icon: r.icon ?? '', slug: r.slug, color: r.color ?? '' }))
}

// ---------- Public pages: products and creators ----------

export interface ProductReview {
  rating: number
  comment: string | null
  createdAt: string
  author: { name: string; avatar: string }
}

// Everything the product's own page shows besides the product itself
export async function getProductPage(id: string) {
  const [product] = await getProductsByIds([id])
  if (!product) return null
  const db = getDb()
  const [{ results: reviewRows }, moreFromSeller, live, upcoming, category] = await Promise.all([
    db
      .prepare(
        `SELECT r.rating, r.comment, r.created_at, u.name, u.avatar FROM reviews r JOIN users u ON u.id = r.user_id
         WHERE r.product_id = ? ORDER BY (r.comment IS NOT NULL AND r.comment != '') DESC, r.created_at DESC LIMIT 10`
      )
      .bind(id)
      .all<Row>(),
    db
      .prepare(`${PRODUCT_SELECT} AND p.seller_id = ? AND p.id != ? ORDER BY p.created_at DESC LIMIT 4`)
      .bind(product.seller.id, id)
      .all<Row>()
      .then(r => hydrateProducts(r.results)),
    getStreams({ live: true }),
    getStreams({ live: false, upcoming: true }),
    db.prepare('SELECT name, slug FROM categories WHERE slug = ?').bind(product.category).first<Row>(),
  ])
  return {
    product,
    category: category ? { name: category.name as string, slug: category.slug as string } : null,
    reviews: reviewRows.map(
      (r): ProductReview => ({
        rating: r.rating,
        comment: r.comment || null,
        createdAt: r.created_at,
        author: { name: r.name, avatar: r.avatar ?? '' },
      })
    ),
    moreFromSeller,
    // Lives on now or coming up that show this product
    streams: [...live, ...upcoming].filter(s => s.products.some(p => p.id === id)).slice(0, 4),
  }
}

// A seller's public page: who they are, their lives (now, next, recorded) and their products.
// Only sellers and hosts have one; banned accounts don't.
export async function getCreatorPage(username: string) {
  const db = getDb()
  const row = await db
    .prepare(
      `SELECT * FROM users WHERE username = ? AND banned_at IS NULL
       AND (is_seller = 1 OR EXISTS (SELECT 1 FROM streams WHERE host_id = users.id))`
    )
    .bind(username)
    .first<Row>()
  if (!row) return null
  const [{ results: productRows }, live, upcoming, recordings] = await Promise.all([
    db.prepare(`${PRODUCT_SELECT} AND p.seller_id = ? ORDER BY p.created_at DESC LIMIT 60`).bind(row.id).all<Row>(),
    getStreams({ live: true, hostId: row.id }),
    getStreams({ live: false, upcoming: true, hostId: row.id }),
    getStreams({ live: false, ended: true, recorded: true, hostId: row.id }),
  ])
  return {
    creator: toUser(row),
    products: await hydrateProducts(productRows),
    live,
    upcoming,
    recordings,
  }
}

// Usernames of sellers with a public page, for the sitemap
export async function getCreatorUsernames(): Promise<string[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT username FROM users WHERE banned_at IS NULL AND username IS NOT NULL
       AND (is_seller = 1 OR EXISTS (SELECT 1 FROM streams WHERE host_id = users.id)) LIMIT 1000`
    )
    .all<Row>()
  return results.map(r => r.username)
}

// Ids of products on sale, for the sitemap
export async function getProductIds(): Promise<string[]> {
  const { results } = await getDb().prepare('SELECT id FROM products WHERE is_active = 1 LIMIT 5000').all<Row>()
  return results.map(r => r.id)
}

// ---------- Users & follows ----------

export async function getUser(id: string): Promise<{ user: User; interests: string[]; isSeller: boolean } | null> {
  const row = await getDb().prepare('SELECT * FROM users WHERE id = ?').bind(id).first<Row>()
  if (!row) return null
  return { user: toUser(row), interests: parseList(row.interests), isSeller: !!row.is_seller }
}

export async function getFollowedHostIds(userId: string): Promise<string[]> {
  const { results } = await getDb()
    .prepare('SELECT followee_id FROM follows WHERE follower_id = ?')
    .bind(userId)
    .all<Row>()
  return results.map(r => r.followee_id)
}

// Inserts/deletes the follow and keeps both users' counters in sync, atomically
export async function setFollow(followerId: string, followeeId: string, follow: boolean) {
  const db = getDb()
  if (follow) {
    await db.batch([
      db.prepare('INSERT OR IGNORE INTO follows (follower_id, followee_id) VALUES (?, ?)').bind(followerId, followeeId),
      db.prepare('UPDATE users SET followers_count = followers_count + changes() WHERE id = ?').bind(followeeId),
      db.prepare(
        `UPDATE users SET following_count = (SELECT count(*) FROM follows WHERE follower_id = ?1) WHERE id = ?1`
      ).bind(followerId),
    ])
  } else {
    await db.batch([
      db.prepare('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?').bind(followerId, followeeId),
      db.prepare('UPDATE users SET followers_count = max(followers_count - changes(), 0) WHERE id = ?').bind(followeeId),
      db.prepare(
        `UPDATE users SET following_count = (SELECT count(*) FROM follows WHERE follower_id = ?1) WHERE id = ?1`
      ).bind(followerId),
    ])
  }
}

export async function setInterests(userId: string, interests: string[]) {
  await getDb().prepare('UPDATE users SET interests = ? WHERE id = ?').bind(JSON.stringify(interests), userId).run()
}

// ---------- Orders ----------

export async function getPurchaseStats(userId: string) {
  const row = await getDb()
    .prepare(
      `SELECT count(*) AS purchases, coalesce(sum(total_cents), 0) AS spent
       FROM orders WHERE user_id = ? AND status != 'cancelled'`
    )
    .bind(userId)
    .first<Row>()
  return { purchases: row?.purchases ?? 0, totalSpent: fromCents(row?.spent ?? 0)! }
}

// Count for the seller's profile header: products on sale
export async function getSellerProfileStats(userId: string) {
  const products = await getDb()
    .prepare('SELECT count(*) AS n FROM products WHERE seller_id = ? AND is_active = 1 AND blocked_at IS NULL')
    .bind(userId)
    .first<number>('n')
  return { products: products ?? 0 }
}

// Auction status follows the clock, not the value stored at creation
export const AUCTION_STATUS = `CASE
  WHEN a.starts_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now') THEN 'upcoming'
  WHEN a.ends_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now') THEN 'active'
  ELSE 'ended' END`

// ---------- Seller dashboard ----------

export interface SellerOrder {
  id: string
  product: Product | undefined
  name: string
  status: string
  // Set while there's a refund or dispute (see lib/refunds.ts): the order mustn't be shipped
  refundStatus: string | null
  createdAt: string
  total: number
  // This seller's shipment: the service the buyer chose and, once sent, the tracking code
  shipment?: { serviceName: string; company: string | null; trackingCode: string | null }
}

// A buyer gave up an order this seller shipped; the seller confirms when the product is back
export interface ReturnRequest {
  orderId: string
  buyerName: string
  buyerEmail: string | null
  items: string
}

const PAID_ORDER = "'confirmed', 'processing', 'shipped', 'delivered'"

export async function getSellerDashboard(sellerId: string) {
  const db = getDb()
  const [{ results: productRows }, liveStreams, scheduledStreams, pastStreams, { results: auctionRows }, salesRow, { results: orderRows }, { results: returnRows }] =
    await Promise.all([
      // Paused products too, so the seller can reactivate them
      db
        .prepare(
          `SELECT p.*, ${userCols('u', 'seller_')} FROM products p JOIN users u ON u.id = p.seller_id
           WHERE p.seller_id = ? ORDER BY p.is_active DESC, p.created_at DESC, p.id`
        )
        .bind(sellerId)
        .all<Row>(),
      getStreams({ live: true, hostId: sellerId }),
      getStreams({ live: false, hostId: sellerId }),
      getStreams({ live: false, ended: true, hostId: sellerId }),
      db
        .prepare(
          `SELECT a.*, ${AUCTION_STATUS} AS live_status, (SELECT count(*) FROM bids b WHERE b.auction_id = a.id) AS bid_count
           FROM auctions a JOIN products p ON p.id = a.product_id
           WHERE p.seller_id = ? ORDER BY a.starts_at`
        )
        .bind(sellerId)
        .all<Row>(),
      // Paid orders only. Each seller's and host's part is what the payment split gave them
      // (after Watchhaul's fee and discounts; see lib/payments.ts), kept in orders.payment_split,
      // without the shipping sellers receive to buy labels
      db
        .prepare(
          `SELECT
             (SELECT count(DISTINCT oi.order_id) FROM order_items oi JOIN orders o ON o.id = oi.order_id
              WHERE oi.seller_id = ?1 AND o.status IN (${PAID_ORDER})) AS orders,
             coalesce((SELECT sum(json_extract(p.value, '$.cents') - coalesce(json_extract(p.value, '$.shippingCents'), 0))
              FROM orders o, json_each(o.payment_split) p
              WHERE o.status IN (${PAID_ORDER}) AND json_extract(p.value, '$.userId') = ?1
                AND json_extract(p.value, '$.role') = 'seller'), 0) AS revenue,
             coalesce((SELECT sum(json_extract(p.value, '$.cents')) FROM orders o, json_each(o.payment_split) p
              WHERE o.status IN (${PAID_ORDER}) AND json_extract(p.value, '$.userId') = ?1
                AND json_extract(p.value, '$.role') = 'host'), 0) AS host_revenue`
        )
        .bind(sellerId)
        .first<Row>(),
      db
        .prepare(
          `SELECT o.id, o.status, o.refund_status, o.created_at, oi.product_id, oi.name,
                  oi.unit_price_cents * oi.quantity - coalesce(oi.host_share_cents, 0) AS total_cents,
                  os.service_name, os.company, os.tracking_code
           FROM order_items oi JOIN orders o ON o.id = oi.order_id
           LEFT JOIN order_shipments os ON os.order_id = o.id AND os.seller_id = oi.seller_id
           WHERE oi.seller_id = ? ORDER BY o.created_at DESC LIMIT 5`
        )
        .bind(sellerId)
        .all<Row>(),
      db
        .prepare(
          `SELECT o.id, u.name AS buyer_name, u.email AS buyer_email,
                  (SELECT group_concat(oi.quantity || '× ' || oi.name, ', ') FROM order_items oi
                   WHERE oi.order_id = o.id AND oi.seller_id = os.seller_id) AS items
           FROM order_shipments os
           JOIN orders o ON o.id = os.order_id
           JOIN users u ON u.id = o.user_id
           WHERE os.seller_id = ? AND o.refund_status = 'requested'
             AND os.shipped_at IS NOT NULL AND os.return_confirmed_at IS NULL
           ORDER BY o.created_at`
        )
        .bind(sellerId)
        .all<Row>(),
    ])

  const products = await hydrateProducts(productRows)
  const streams = [...liveStreams, ...scheduledStreams]
  const productById = new Map(products.map(p => [p.id, p]))

  const auctions: Auction[] = auctionRows.filter(a => productById.has(a.product_id)).map(a => ({
    id: a.id,
    product: productById.get(a.product_id)!,
    startingPrice: fromCents(a.starting_price_cents)!,
    currentBid: fromCents(a.current_bid_cents)!,
    minimumIncrement: fromCents(a.minimum_increment_cents)!,
    startTime: a.starts_at,
    endTime: a.ends_at,
    bids: Array.from({ length: a.bid_count }, (_, i) => ({ id: `${a.id}-${i}` }) as AuctionBid),
    status: a.live_status,
    winnerId: a.winner_id ?? undefined,
    streamId: a.stream_id ?? undefined,
  }))

  const recentOrders: SellerOrder[] = orderRows.map(o => ({
    id: o.id,
    product: productById.get(o.product_id),
    name: o.name,
    status: o.status,
    refundStatus: o.refund_status,
    createdAt: o.created_at,
    total: fromCents(o.total_cents)!,
    shipment: o.service_name ? { serviceName: o.service_name, company: o.company, trackingCode: o.tracking_code } : undefined,
  }))

  return {
    products,
    streams,
    pastStreams,
    auctions,
    recentOrders,
    returnRequests: returnRows.map((r): ReturnRequest => ({ orderId: r.id, buyerName: r.buyer_name, buyerEmail: r.buyer_email, items: r.items })),
    stats: {
      // Own sales plus shares earned hosting guest sellers
      revenue: fromCents((salesRow?.revenue ?? 0) + (salesRow?.host_revenue ?? 0))!,
      hostRevenue: fromCents(salesRow?.host_revenue ?? 0)!,
      orders: salesRow?.orders ?? 0,
      viewers: streams.reduce((sum, s) => sum + (s.isLive ? s.viewerCount : 0), 0),
    },
  }
}
