import 'server-only'
import { getDb, getProductsByIds, AUCTION_STATUS } from './db'
import type { Auction, AuctionBid, FlashSale, Notification, Poll, Product } from '@/types'

type Row = Record<string, any>
const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`

// ---------- Auctions & bids ----------

export async function getStreamAuctions(streamId: string, products: Product[]): Promise<Auction[]> {
  const db = getDb()
  const { results: rows } = await db
    .prepare(`SELECT a.*, ${AUCTION_STATUS} AS live_status FROM auctions a WHERE a.stream_id = ? ORDER BY a.ends_at`)
    .bind(streamId)
    .all<Row>()
  if (rows.length === 0) return []

  const ids = rows.map(r => r.id)
  const { results: bidRows } = await db
    .prepare(
      `SELECT b.*, u.name, u.username, u.avatar, u.is_verified, u.followers_count, u.following_count
       FROM bids b JOIN users u ON u.id = b.user_id
       WHERE b.auction_id IN (${ids.map(() => '?').join(',')})
       ORDER BY b.amount_cents`
    )
    .bind(...ids)
    .all<Row>()

  // Auction products may not be in the stream's product list
  const byId = new Map(products.map(p => [p.id, p]))
  const missing = rows.map(r => r.product_id).filter(id => !byId.has(id))
  if (missing.length) {
    for (const p of await getProductsByIds(missing)) byId.set(p.id, p)
  }

  return rows
    .filter(r => byId.has(r.product_id))
    .map(r => ({
      id: r.id,
      product: byId.get(r.product_id)!,
      startingPrice: r.starting_price_cents / 100,
      currentBid: r.current_bid_cents / 100,
      minimumIncrement: r.minimum_increment_cents / 100,
      startTime: r.starts_at,
      endTime: r.ends_at,
      status: r.live_status,
      streamId: r.stream_id ?? undefined,
      winnerId: r.winner_id ?? undefined,
      bids: bidRows
        .filter(b => b.auction_id === r.id)
        .map(
          (b): AuctionBid => ({
            id: b.id,
            auctionId: r.id,
            amount: b.amount_cents / 100,
            timestamp: b.created_at,
            user: {
              id: b.user_id,
              name: b.name,
              username: b.username,
              avatar: b.avatar ?? '',
              isVerified: !!b.is_verified,
              followers: b.followers_count,
              following: b.following_count,
            },
          })
        ),
    }))
}

export type BidResult =
  | { ok: true; currentBid: number }
  | { ok: false; reason: 'NOT_FOUND' | 'CLOSED' | 'TOO_LOW' | 'OWN_AUCTION'; currentBid?: number; minimumBid?: number }

export async function placeBid(userId: string, auctionId: string, amount: number): Promise<BidResult> {
  const db = getDb()
  const amountCents = Math.round(amount * 100)
  const bidId = crypto.randomUUID()

  // One conditional UPDATE decides the bid: D1 runs a batch as a single transaction,
  // so two equal bids can't both win.
  await db.batch([
    db
      .prepare(
        `UPDATE auctions SET current_bid_cents = ?1
         WHERE id = ?2
           AND starts_at <= ${NOW} AND ends_at > ${NOW}
           AND ?1 >= current_bid_cents + minimum_increment_cents
           AND (SELECT seller_id FROM products WHERE id = auctions.product_id) != ?3`
      )
      .bind(amountCents, auctionId, userId),
    db
      .prepare('INSERT INTO bids (id, auction_id, user_id, amount_cents) SELECT ?, ?, ?, ? WHERE changes() = 1')
      .bind(bidId, auctionId, userId, amountCents),
    // Tell the previous top bidder they were outbid
    db
      .prepare(
        `INSERT INTO notifications (id, user_id, type, title, message, action_url)
         SELECT lower(hex(randomblob(16))), b.user_id, 'message', 'Seu lance foi superado',
                'Alguém ofereceu R$ ' || printf('%.2f', ?1 / 100.0) || '. Dê um novo lance!',
                coalesce('/live/' || a.stream_id, '/')
         FROM bids b JOIN auctions a ON a.id = b.auction_id
         WHERE b.id = (SELECT id FROM bids WHERE auction_id = ?2 AND id != ?3 ORDER BY amount_cents DESC LIMIT 1)
           AND b.user_id != ?4
           AND EXISTS (SELECT 1 FROM bids WHERE id = ?3)`
      )
      .bind(amountCents, auctionId, bidId, userId),
  ])

  const placed = await db.prepare('SELECT 1 FROM bids WHERE id = ?').bind(bidId).first()
  const a = await db
    .prepare(
      `SELECT a.current_bid_cents, a.minimum_increment_cents, ${AUCTION_STATUS} AS live_status, p.seller_id
       FROM auctions a JOIN products p ON p.id = a.product_id WHERE a.id = ?`
    )
    .bind(auctionId)
    .first<Row>()
  if (!a) return { ok: false, reason: 'NOT_FOUND' }
  if (placed) return { ok: true, currentBid: a.current_bid_cents / 100 }

  const currentBid = a.current_bid_cents / 100
  if (a.seller_id === userId) return { ok: false, reason: 'OWN_AUCTION' }
  if (a.live_status !== 'active') return { ok: false, reason: 'CLOSED', currentBid }
  return { ok: false, reason: 'TOO_LOW', currentBid, minimumBid: (a.current_bid_cents + a.minimum_increment_cents) / 100 }
}

// ---------- Flash sales ----------

export async function getActiveFlashSale(streamId: string): Promise<FlashSale | null> {
  const row = await getDb()
    .prepare(
      `SELECT * FROM flash_sales
       WHERE stream_id = ? AND starts_at <= ${NOW} AND ends_at > ${NOW} AND quantity_sold < quantity_available
       ORDER BY ends_at LIMIT 1`
    )
    .bind(streamId)
    .first<Row>()
  if (!row) return null
  const [product] = await getProductsByIds([row.product_id])
  if (!product) return null
  return {
    id: row.id,
    product,
    discountPercentage: row.discount_percent,
    startTime: row.starts_at,
    endTime: row.ends_at,
    quantityAvailable: row.quantity_available,
    quantitySold: row.quantity_sold,
  }
}

// ---------- Polls ----------

export async function getActivePoll(streamId: string, userId?: string): Promise<(Poll & { myVote?: string }) | null> {
  const db = getDb()
  const poll = await db
    .prepare(
      `SELECT * FROM polls WHERE stream_id = ? AND is_active = 1 AND (ends_at IS NULL OR ends_at > ${NOW})
       ORDER BY created_at DESC LIMIT 1`
    )
    .bind(streamId)
    .first<Row>()
  if (!poll) return null

  const [{ results: options }, myVote] = await Promise.all([
    db
      .prepare(
        `SELECT o.id, o.text, o.base_votes + (SELECT count(*) FROM poll_votes v WHERE v.option_id = o.id) AS votes
         FROM poll_options o WHERE o.poll_id = ? ORDER BY o.sort_order`
      )
      .bind(poll.id)
      .all<Row>(),
    userId
      ? db.prepare('SELECT option_id FROM poll_votes WHERE poll_id = ? AND user_id = ?').bind(poll.id, userId).first<Row>()
      : null,
  ])
  const total = options.reduce((sum, o) => sum + o.votes, 0)
  return {
    id: poll.id,
    question: poll.question,
    isActive: true,
    endsAt: poll.ends_at ?? undefined,
    totalVotes: total,
    options: options.map(o => ({
      id: o.id,
      text: o.text,
      votes: o.votes,
      percentage: total ? Math.round((o.votes / total) * 100) : 0,
    })),
    myVote: myVote?.option_id,
  }
}

// One vote per user per poll; voting again changes the vote
export async function votePoll(userId: string, pollId: string, optionId: string) {
  const result = await getDb()
    .prepare(
      `INSERT INTO poll_votes (poll_id, user_id, option_id)
       SELECT ?1, ?2, ?3 WHERE EXISTS (
         SELECT 1 FROM poll_options o JOIN polls p ON p.id = o.poll_id
         WHERE o.id = ?3 AND p.id = ?1 AND p.is_active = 1
       )
       ON CONFLICT (poll_id, user_id) DO UPDATE SET option_id = excluded.option_id`
    )
    .bind(pollId, userId, optionId)
    .run()
  return result.meta.changes > 0
}

// ---------- Favorites ----------

export async function getFavoriteIds(userId: string): Promise<string[]> {
  const { results } = await getDb()
    .prepare('SELECT product_id FROM favorites WHERE user_id = ? ORDER BY created_at DESC')
    .bind(userId)
    .all<Row>()
  return results.map(r => r.product_id)
}

export async function setFavorite(userId: string, productId: string, favorite: boolean) {
  const db = getDb()
  if (favorite) {
    await db
      .prepare('INSERT OR IGNORE INTO favorites (user_id, product_id) SELECT ?, id FROM products WHERE id = ?')
      .bind(userId, productId)
      .run()
  } else {
    await db.prepare('DELETE FROM favorites WHERE user_id = ? AND product_id = ?').bind(userId, productId).run()
  }
}

// ---------- Notifications ----------

export async function getNotifications(userId: string): Promise<Notification[]> {
  const { results } = await getDb()
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
    .bind(userId)
    .all<Row>()
  return results.map(r => ({
    id: r.id,
    type: r.type,
    title: r.title,
    message: r.message,
    timestamp: r.created_at,
    isRead: !!r.is_read,
    actionUrl: r.action_url ?? undefined,
    image: r.image ?? undefined,
  }))
}

export async function markNotificationsRead(userId: string, id?: string) {
  const db = getDb()
  await (id
    ? db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id = ?').bind(userId, id)
    : db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').bind(userId)
  ).run()
}

export async function clearNotifications(userId: string) {
  await getDb().prepare('DELETE FROM notifications WHERE user_id = ?').bind(userId).run()
}
