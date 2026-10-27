import 'server-only'
import { getDb } from './db'
import { notify } from './orders'

// Guest sellers: a live's host invites other sellers; once they accept, they add their own
// products and auctions to that live. Sales of a guest's product through the live are split
// with the host (see HOST_SHARE and liveSplits).

// The host's part of a guest's sale. Fixed for now; the seller gets the rest.
export const HOST_SHARE = 0.5

export type GuestStatus = 'invited' | 'accepted' | 'declined' | 'removed'

export interface StreamGuest {
  sellerId: string
  name: string
  username: string
  avatar: string
  status: GuestStatus
}

export interface GuestInvite {
  streamId: string
  title: string
  status: GuestStatus
  scheduledAt: string | null
  streamStatus: 'scheduled' | 'live' | 'ended'
  host: { id: string; name: string; username: string }
}

async function hostedStream(hostId: string, streamId: string) {
  return getDb()
    .prepare(`SELECT id, title FROM streams WHERE id = ? AND host_id = ? AND status != 'ended'`)
    .bind(streamId, hostId)
    .first<{ id: string; title: string }>()
}

// Host or accepted guest of a live that hasn't ended
export async function canSellInStream(sellerId: string, streamId: string) {
  return !!(await getDb()
    .prepare(
      `SELECT 1 FROM streams s WHERE s.id = ?1 AND s.status != 'ended' AND (s.host_id = ?2 OR EXISTS (
         SELECT 1 FROM stream_guests g WHERE g.stream_id = s.id AND g.seller_id = ?2 AND g.status = 'accepted'))`
    )
    .bind(streamId, sellerId)
    .first())
}

export type InviteResult = 'ok' | 'forbidden' | 'not_found' | 'self' | 'already'

export async function inviteGuest(hostId: string, streamId: string, username: string): Promise<InviteResult> {
  const db = getDb()
  const stream = await hostedStream(hostId, streamId)
  if (!stream) return 'forbidden'
  const guest = await db
    .prepare('SELECT id FROM users WHERE username = ? AND is_seller = 1')
    .bind(username.replace(/^@/, ''))
    .first<{ id: string }>()
  if (!guest) return 'not_found'
  if (guest.id === hostId) return 'self'

  // A seller who declined or was removed can be invited again
  const res = await db
    .prepare(
      `INSERT INTO stream_guests (stream_id, seller_id) VALUES (?, ?)
       ON CONFLICT (stream_id, seller_id) DO UPDATE SET status = 'invited', invited_at = excluded.invited_at, responded_at = NULL
       WHERE stream_guests.status IN ('declined', 'removed')`
    )
    .bind(streamId, guest.id)
    .run()
  if (res.meta.changes === 0) return 'already'
  await notify(guest.id, 'message', 'Convite para uma live', `Você foi convidado para vender na live "${stream.title}".`, '/seller/dashboard').run()
  return 'ok'
}

export async function respondToInvite(sellerId: string, streamId: string, accept: boolean) {
  const db = getDb()
  const res = await db
    .prepare(
      `UPDATE stream_guests SET status = ?, responded_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE stream_id = ? AND seller_id = ? AND status = 'invited'
         AND (SELECT status FROM streams WHERE id = stream_id) != 'ended'`
    )
    .bind(accept ? 'accepted' : 'declined', streamId, sellerId)
    .run()
  if (res.meta.changes === 0) return false
  const info = await db
    .prepare('SELECT s.host_id, s.title, u.name FROM streams s, users u WHERE s.id = ? AND u.id = ?')
    .bind(streamId, sellerId)
    .first<{ host_id: string; title: string; name: string }>()
  if (info) {
    await notify(
      info.host_id,
      'message',
      accept ? 'Convite aceito' : 'Convite recusado',
      `${info.name} ${accept ? 'aceitou' : 'recusou'} o convite para a live "${info.title}".`,
      '/seller/dashboard'
    ).run()
  }
  return true
}

// Removing a guest takes their products off the live (and unpins one if it was pinned).
// Their auctions keep running so bidders aren't cut off mid-auction.
export async function removeGuest(hostId: string, streamId: string, sellerId: string) {
  if (!(await hostedStream(hostId, streamId))) return false
  const db = getDb()
  const guestProducts = `SELECT id FROM products WHERE seller_id = ?2`
  const [res] = await db.batch([
    db
      .prepare(`UPDATE stream_guests SET status = 'removed' WHERE stream_id = ?1 AND seller_id = ?2 AND status IN ('invited', 'accepted')`)
      .bind(streamId, sellerId),
    db.prepare(`DELETE FROM stream_products WHERE stream_id = ?1 AND product_id IN (${guestProducts})`).bind(streamId, sellerId),
    db
      .prepare(`UPDATE streams SET pinned_product_id = NULL WHERE id = ?1 AND pinned_product_id IN (${guestProducts})`)
      .bind(streamId, sellerId),
  ])
  return res.meta.changes > 0
}

export async function getStreamGuests(hostId: string, streamId: string): Promise<StreamGuest[] | null> {
  if (!(await hostedStream(hostId, streamId))) return null
  const { results } = await getDb()
    .prepare(
      `SELECT g.seller_id, g.status, u.name, u.username, u.avatar FROM stream_guests g JOIN users u ON u.id = g.seller_id
       WHERE g.stream_id = ? AND g.status IN ('invited', 'accepted') ORDER BY g.invited_at`
    )
    .bind(streamId)
    .all<Record<string, any>>()
  return results.map(r => ({ sellerId: r.seller_id, name: r.name, username: r.username, avatar: r.avatar ?? '', status: r.status }))
}

// Invitations a seller has received (pending or accepted) for lives that haven't ended
export async function getGuestInvites(sellerId: string): Promise<GuestInvite[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT s.id, s.title, s.status AS stream_status, s.scheduled_at, g.status, u.id AS host_id, u.name, u.username
       FROM stream_guests g JOIN streams s ON s.id = g.stream_id JOIN users u ON u.id = s.host_id
       WHERE g.seller_id = ? AND g.status IN ('invited', 'accepted') AND s.status != 'ended'
       ORDER BY coalesce(s.scheduled_at, s.started_at)`
    )
    .bind(sellerId)
    .all<Record<string, any>>()
  return results.map(r => ({
    streamId: r.id,
    title: r.title,
    status: r.status,
    scheduledAt: r.scheduled_at,
    streamStatus: r.stream_status,
    host: { id: r.host_id, name: r.name, username: r.username },
  }))
}

// The host or an accepted guest adds their own active products to the live
export async function addStreamProducts(sellerId: string, streamId: string, productIds: string[]) {
  if (!(await canSellInStream(sellerId, streamId))) return false
  if (productIds.length === 0) return true
  const db = getDb()
  await db
    .prepare(
      `INSERT OR IGNORE INTO stream_products (stream_id, product_id, sort_order)
       SELECT ?1, p.id, (SELECT coalesce(max(sort_order), -1) + 1 FROM stream_products WHERE stream_id = ?1)
       FROM products p WHERE p.seller_id = ?2 AND p.is_active = 1 AND p.id IN (${productIds.map((_, i) => `?${i + 3}`).join(',')})`
    )
    .bind(streamId, sellerId, ...productIds)
    .run()
  return true
}

// A seller takes their own product off the live; the host can take off anyone's
export async function removeStreamProduct(sellerId: string, streamId: string, productId: string) {
  const res = await getDb()
    .prepare(
      `DELETE FROM stream_products WHERE stream_id = ?1 AND product_id = ?2
         AND ((SELECT seller_id FROM products WHERE id = ?2) = ?3 OR (SELECT host_id FROM streams WHERE id = ?1) = ?3)`
    )
    .bind(streamId, productId, sellerId)
    .run()
  return res.meta.changes > 0
}

export interface LiveSplit {
  streamId: string
  hostId: string
}

// Which live, if any, a guest's product is being sold through right now: the product is
// featured in a live that's on air, its seller is an accepted guest there, and the seller
// isn't the host. A won auction is credited to the live it ran in, even after it ended.
export async function liveSplits(productIds: string[], auctionId?: string): Promise<Map<string, LiveSplit>> {
  const splits = new Map<string, LiveSplit>()
  if (productIds.length === 0) return splits
  const db = getDb()
  if (auctionId) {
    const row = await db
      .prepare(
        `SELECT a.product_id, s.id AS stream_id, s.host_id FROM auctions a
         JOIN streams s ON s.id = a.stream_id JOIN products p ON p.id = a.product_id
         JOIN stream_guests g ON g.stream_id = s.id AND g.seller_id = p.seller_id AND g.status = 'accepted'
         WHERE a.id = ? AND p.seller_id != s.host_id`
      )
      .bind(auctionId)
      .first<{ product_id: string; stream_id: string; host_id: string }>()
    if (row) splits.set(row.product_id, { streamId: row.stream_id, hostId: row.host_id })
    return splits
  }
  const { results } = await db
    .prepare(
      `SELECT sp.product_id, s.id AS stream_id, s.host_id FROM stream_products sp
       JOIN streams s ON s.id = sp.stream_id AND s.status = 'live'
       JOIN products p ON p.id = sp.product_id AND p.seller_id != s.host_id
       JOIN stream_guests g ON g.stream_id = s.id AND g.seller_id = p.seller_id AND g.status = 'accepted'
       WHERE sp.product_id IN (${productIds.map(() => '?').join(',')})
       ORDER BY s.started_at`
    )
    .bind(...productIds)
    .all<{ product_id: string; stream_id: string; host_id: string }>()
  // A product featured in two lives at once is credited to the one that started first
  for (const r of results) if (!splits.has(r.product_id)) splits.set(r.product_id, { streamId: r.stream_id, hostId: r.host_id })
  return splits
}
