import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { User, Product, ProductVariant, Stream, Course, CourseModule, Category, Auction, AuctionBid } from '@/types'

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
  }
}

// ---------- Products ----------

const PRODUCT_SELECT = `
  SELECT p.*, ${userCols('u', 'seller_')}
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

export async function getProducts({
  onSale = false,
  inStock = false,
  sort = 'default' as keyof typeof PRODUCT_ORDER,
  limit = 20,
} = {}): Promise<Product[]> {
  const { results } = await getDb()
    .prepare(
      `${PRODUCT_SELECT} ${onSale ? 'AND p.original_price_cents > p.price_cents' : ''} ${inStock ? 'AND p.stock > 0' : ''}
       ORDER BY ${PRODUCT_ORDER[sort]} LIMIT ?`
    )
    .bind(limit)
    .all<Row>()
  return hydrateProducts(results)
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

// LIKE pattern with the user's %, _ and \ escaped
const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, c => `\\${c}`)}%`

export async function search(q: string) {
  const db = getDb()
  const pattern = likePattern(q)
  const [{ results: productRows }, { results: sellerRows }, streams] = await Promise.all([
    db
      .prepare(
        `${PRODUCT_SELECT} AND (p.name LIKE ?1 ESCAPE '\\' OR p.description LIKE ?1 ESCAPE '\\' OR p.tags LIKE ?1 ESCAPE '\\')
         ORDER BY p.name LIKE ?1 ESCAPE '\\' DESC, p.reviews_count DESC LIMIT 40`
      )
      .bind(pattern)
      .all<Row>(),
    db
      .prepare(
        `SELECT * FROM users WHERE is_seller = 1 AND (name LIKE ?1 ESCAPE '\\' OR username LIKE ?1 ESCAPE '\\')
         ORDER BY followers_count DESC LIMIT 10`
      )
      .bind(pattern)
      .all<Row>(),
    Promise.all([getStreams({ live: true }), getStreams({ live: false })]),
  ])
  const needle = q.toLowerCase()
  return {
    products: await hydrateProducts(productRows),
    sellers: sellerRows.map(r => toUser(r)),
    streams: streams
      .flat()
      .filter(s => s.title.toLowerCase().includes(needle) || s.host.name.toLowerCase().includes(needle))
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
// recorded: only those with a recording
export async function getStreams({
  live,
  ended,
  recorded,
  hostId,
  id,
}: {
  live: boolean
  ended?: boolean
  recorded?: boolean
  hostId?: string
  id?: string
}): Promise<Stream[]> {
  const db = getDb()
  const filters = [hostId ? 'AND s.host_id = ?' : '', id ? 'AND s.id = ?' : '', recorded ? 'AND s.video_url IS NOT NULL' : ''].join(' ')
  const { results: rows } = await db
    .prepare(
      `SELECT s.*, ${userCols('u', 'host_')}
       FROM streams s JOIN users u ON u.id = s.host_id
       WHERE s.status ${ended ? "= 'ended'" : live ? "= 'live'" : "= 'scheduled'"} ${filters}
       ORDER BY ${ended ? 's.ended_at DESC LIMIT 20' : live ? 's.viewer_count DESC' : 's.scheduled_at'}`
    )
    .bind(...[hostId, id].filter((v): v is string => !!v))
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
    thumbnail: r.thumbnail ?? '',
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

// ---------- Courses ----------

export async function getCourses({ limit = 20 } = {}): Promise<Course[]> {
  const db = getDb()
  const { results: rows } = await db
    .prepare(
      `SELECT c.*, ${userCols('u', 'instructor_')}
       FROM courses c JOIN users u ON u.id = c.instructor_id
       ORDER BY c.students_count DESC LIMIT ?`
    )
    .bind(limit)
    .all<Row>()
  if (rows.length === 0) return []

  const ids = rows.map(r => r.id)
  const { results: lessonRows } = await db
    .prepare(
      `SELECT m.course_id, m.id AS module_id, m.title AS module_title, m.duration AS module_duration,
              l.id, l.title, l.duration, l.is_free, l.type
       FROM course_modules m LEFT JOIN course_lessons l ON l.module_id = m.id
       WHERE m.course_id IN (${ids.map(() => '?').join(',')})
       ORDER BY m.sort_order, l.sort_order`
    )
    .bind(...ids)
    .all<Row>()

  const modules = new Map<string, CourseModule[]>()
  for (const r of lessonRows) {
    const list = modules.get(r.course_id) ?? []
    let mod = list.find(m => m.id === r.module_id)
    if (!mod) {
      mod = { id: r.module_id, title: r.module_title, duration: r.module_duration ?? '', lessonsCount: 0, lessons: [] }
      list.push(mod)
      modules.set(r.course_id, list)
    }
    if (r.id) {
      mod.lessons.push({ id: r.id, title: r.title, duration: r.duration ?? '', isFree: !!r.is_free, type: r.type })
      mod.lessonsCount++
    }
  }

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    price: fromCents(r.price_cents)!,
    originalPrice: fromCents(r.original_price_cents),
    thumbnail: r.thumbnail ?? '',
    category: r.category_slug,
    instructor: toUser(r, 'instructor_'),
    rating: r.rating,
    reviews: r.reviews_count,
    tags: parseList(r.tags),
    itemType: 'course' as const,
    duration: r.duration ?? '',
    lessonsCount: r.lessons_count,
    studentsCount: r.students_count,
    level: r.level,
    language: r.language,
    lastUpdated: r.updated_at,
    modules: modules.get(r.id) ?? [],
    certificateIncluded: !!r.certificate_included,
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

export async function getCategories(): Promise<Category[]> {
  const { results } = await getDb().prepare('SELECT * FROM categories ORDER BY sort_order').all<Row>()
  return results.map(r => ({ id: r.id, name: r.name, icon: r.icon ?? '', slug: r.slug, color: r.color ?? '' }))
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
  createdAt: string
  total: number
}

export async function getSellerDashboard(sellerId: string) {
  const db = getDb()
  const [{ results: productRows }, liveStreams, scheduledStreams, pastStreams, { results: auctionRows }, salesRow, { results: orderRows }] =
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
      // A guest's sale through someone's live is split: the seller keeps the line minus the
      // host's share, and the host earns host_share_cents
      db
        .prepare(
          `SELECT count(DISTINCT CASE WHEN oi.seller_id = ?1 THEN oi.order_id END) AS orders,
                  coalesce(sum(CASE WHEN oi.seller_id = ?1
                    THEN oi.unit_price_cents * oi.quantity - coalesce(oi.host_share_cents, 0) ELSE 0 END), 0) AS revenue,
                  coalesce(sum(CASE WHEN oi.host_id = ?1 THEN oi.host_share_cents ELSE 0 END), 0) AS host_revenue
           FROM order_items oi JOIN orders o ON o.id = oi.order_id
           WHERE (oi.seller_id = ?1 OR oi.host_id = ?1) AND o.status != 'cancelled'`
        )
        .bind(sellerId)
        .first<Row>(),
      db
        .prepare(
          `SELECT o.id, o.status, o.created_at, oi.product_id, oi.name,
                  oi.unit_price_cents * oi.quantity - coalesce(oi.host_share_cents, 0) AS total_cents
           FROM order_items oi JOIN orders o ON o.id = oi.order_id
           WHERE oi.seller_id = ? ORDER BY o.created_at DESC LIMIT 5`
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
    createdAt: o.created_at,
    total: fromCents(o.total_cents)!,
  }))

  return {
    products,
    streams,
    pastStreams,
    auctions,
    recentOrders,
    stats: {
      // Own sales plus shares earned hosting guest sellers
      revenue: fromCents((salesRow?.revenue ?? 0) + (salesRow?.host_revenue ?? 0))!,
      hostRevenue: fromCents(salesRow?.host_revenue ?? 0)!,
      orders: salesRow?.orders ?? 0,
      viewers: streams.reduce((sum, s) => sum + (s.isLive ? s.viewerCount : 0), 0),
    },
  }
}
