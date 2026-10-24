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
    rating: row.rating,
    reviews: row.reviews_count,
    seller: toUser(row, 'seller_'),
    tags: parseList(row.tags),
    itemType: 'product',
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

async function hydrateProducts(rows: Row[]): Promise<Product[]> {
  const variants = await variantsFor(rows.map(r => r.id))
  return rows.map(r => toProduct(r, variants.get(r.id)))
}

export async function getProducts({ onSale = false, limit = 20 } = {}): Promise<Product[]> {
  const { results } = await getDb()
    .prepare(
      `${PRODUCT_SELECT} ${onSale ? 'AND p.original_price_cents IS NOT NULL' : ''}
       ORDER BY p.created_at, p.id LIMIT ?`
    )
    .bind(limit)
    .all<Row>()
  return hydrateProducts(results)
}

// ---------- Streams ----------

export async function getStreams({ live }: { live: boolean }): Promise<Stream[]> {
  const db = getDb()
  const { results: rows } = await db
    .prepare(
      `SELECT s.*, ${userCols('u', 'host_')}
       FROM streams s JOIN users u ON u.id = s.host_id
       WHERE s.status ${live ? "= 'live'" : "= 'scheduled'"}
       ORDER BY ${live ? 's.viewer_count DESC' : 's.scheduled_at'}`
    )
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
    viewerCount: r.viewer_count,
    startTime: r.started_at ?? r.scheduled_at ?? '',
    scheduledTime: r.scheduled_at ?? undefined,
    category: r.category_slug,
    products: byStream.get(r.id) ?? [],
    tags: parseList(r.tags),
    likes: r.likes,
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
  const [live, scheduled] = await Promise.all([getStreams({ live: true }), getStreams({ live: false })])
  return [...live, ...scheduled].find(s => s.id === id) ?? null
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
  const [{ results: productRows }, liveStreams, scheduledStreams, { results: auctionRows }, salesRow, { results: orderRows }] =
    await Promise.all([
      db.prepare(`${PRODUCT_SELECT} AND p.seller_id = ? ORDER BY p.created_at DESC, p.id`).bind(sellerId).all<Row>(),
      getStreams({ live: true }),
      getStreams({ live: false }),
      db
        .prepare(
          `SELECT a.*, (SELECT count(*) FROM bids b WHERE b.auction_id = a.id) AS bid_count
           FROM auctions a JOIN products p ON p.id = a.product_id
           WHERE p.seller_id = ? ORDER BY a.starts_at`
        )
        .bind(sellerId)
        .all<Row>(),
      db
        .prepare(
          `SELECT count(DISTINCT oi.order_id) AS orders, coalesce(sum(oi.unit_price_cents * oi.quantity), 0) AS revenue
           FROM order_items oi JOIN orders o ON o.id = oi.order_id
           WHERE oi.seller_id = ? AND o.status != 'cancelled'`
        )
        .bind(sellerId)
        .first<Row>(),
      db
        .prepare(
          `SELECT o.id, o.status, o.created_at, oi.product_id, oi.name, oi.unit_price_cents * oi.quantity AS total_cents
           FROM order_items oi JOIN orders o ON o.id = oi.order_id
           WHERE oi.seller_id = ? ORDER BY o.created_at DESC LIMIT 5`
        )
        .bind(sellerId)
        .all<Row>(),
    ])

  const products = await hydrateProducts(productRows)
  const streams = [...liveStreams, ...scheduledStreams].filter(s => s.host.id === sellerId)
  const productById = new Map(products.map(p => [p.id, p]))

  const auctions: Auction[] = auctionRows.map(a => ({
    id: a.id,
    product: productById.get(a.product_id)!,
    startingPrice: fromCents(a.starting_price_cents)!,
    currentBid: fromCents(a.current_bid_cents)!,
    minimumIncrement: fromCents(a.minimum_increment_cents)!,
    startTime: a.starts_at,
    endTime: a.ends_at,
    bids: Array.from({ length: a.bid_count }, (_, i) => ({ id: `${a.id}-${i}` }) as AuctionBid),
    status: a.status,
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
    auctions,
    recentOrders,
    stats: {
      revenue: fromCents(salesRow?.revenue ?? 0)!,
      orders: salesRow?.orders ?? 0,
      viewers: streams.reduce((sum, s) => sum + (s.isLive ? s.viewerCount : 0), 0),
    },
  }
}
