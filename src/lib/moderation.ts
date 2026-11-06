import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getDb } from './db'
import { getSession } from './auth'
import { notify } from './orders'
import { broadcast } from './live'
import { closeVideoRoom } from './video'
import { END_STREAM_SQL } from './livekit'
import { REPORT_REASONS, type ReportReason, type ReportTarget } from './report-reasons'

// Reports from users and what admins do about them. Admins are the accounts whose e-mail is
// in the ADMIN_EMAILS secret (comma-separated); the repository is public, so it's not in code.
//
// Bans take effect at once for new logins, chat, selling and the seller's listings. A
// session already open can keep browsing until its cached cookie expires (up to 5 minutes).

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
const REPORTS_PER_DAY = 20

const adminEmails = () =>
  (getCloudflareContext().env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)

export async function isAdmin(userId: string) {
  const emails = adminEmails()
  if (emails.length === 0) return false
  const user = await getDb().prepare('SELECT email, banned_at FROM users WHERE id = ?').bind(userId).first<{ email: string | null; banned_at: string | null }>()
  return !!user?.email && !user.banned_at && emails.includes(user.email.toLowerCase())
}

// Returns the signed-in admin's id, or a Response to send back
export async function requireAdmin(): Promise<string | Response> {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  if (!(await isAdmin(session.user.id))) return new Response('Forbidden', { status: 403 })
  return session.user.id
}

// ---------- Reports ----------

// What's being reported: its owner and a copy of the content
async function findTarget(type: ReportTarget, id: string) {
  const db = getDb()
  if (type === 'product') {
    const p = await db.prepare('SELECT seller_id, name, description FROM products WHERE id = ?').bind(id).first<{ seller_id: string; name: string; description: string | null }>()
    return p && { userId: p.seller_id, text: [p.name, p.description].filter(Boolean).join(' — ').slice(0, 500), streamId: null }
  }
  if (type === 'stream') {
    const s = await db.prepare('SELECT host_id, title FROM streams WHERE id = ?').bind(id).first<{ host_id: string; title: string }>()
    return s && { userId: s.host_id, text: s.title, streamId: id }
  }
  const m = await db.prepare('SELECT user_id, message, stream_id FROM chat_messages WHERE id = ?').bind(id).first<{ user_id: string; message: string; stream_id: string }>()
  return m && { userId: m.user_id, text: m.message, streamId: m.stream_id }
}

export async function createReport(
  reporterId: string,
  input: { type: ReportTarget; id: string; reason: ReportReason; details: string | null }
): Promise<'ok' | 'not_found' | 'too_many'> {
  const db = getDb()
  const recent = await db
    .prepare(`SELECT count(*) AS n FROM reports WHERE reporter_id = ? AND created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')`)
    .bind(reporterId)
    .first<number>('n')
  if ((recent ?? 0) >= REPORTS_PER_DAY) return 'too_many'
  const target = await findTarget(input.type, input.id)
  if (!target) return 'not_found'
  // Reporting the same thing twice just keeps the first report
  await db
    .prepare(
      `INSERT OR IGNORE INTO reports (id, reporter_id, target_type, target_id, target_user_id, target_text, stream_id, reason, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(crypto.randomUUID(), reporterId, input.type, input.id, target.userId, target.text, target.streamId, input.reason, input.details)
    .run()
  return 'ok'
}

export interface OpenReport {
  id: string
  type: ReportTarget
  targetId: string
  text: string
  streamId: string | null
  reason: string
  details: string | null
  createdAt: string
  reporter: string
  userId: string | null
  userName: string | null
  userEmail: string | null
  // Open reports against this person, this one included
  userReports: number
}

export async function getOpenReports(): Promise<OpenReport[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT r.*, reporter.name AS reporter_name, u.name AS user_name, u.email AS user_email,
              (SELECT count(*) FROM reports x WHERE x.target_user_id = r.target_user_id AND x.status = 'open') AS user_reports
       FROM reports r
       JOIN users reporter ON reporter.id = r.reporter_id
       LEFT JOIN users u ON u.id = r.target_user_id
       WHERE r.status = 'open' ORDER BY r.created_at LIMIT 100`
    )
    .all<Record<string, any>>()
  return results.map(r => ({
    id: r.id,
    type: r.target_type,
    targetId: r.target_id,
    text: r.target_text,
    streamId: r.stream_id,
    reason: REPORT_REASONS[r.reason as ReportReason] ?? r.reason,
    details: r.details,
    createdAt: r.created_at,
    reporter: r.reporter_name,
    userId: r.target_user_id,
    userName: r.user_name,
    userEmail: r.user_email,
    userReports: r.user_reports,
  }))
}

// ---------- Taking things down ----------

async function removeProduct(productId: string) {
  const db = getDb()
  const product = await db
    .prepare(`UPDATE products SET is_active = 0, blocked_at = ${NOW} WHERE id = ? AND blocked_at IS NULL RETURNING seller_id, name`)
    .bind(productId)
    .first<{ seller_id: string; name: string }>()
  if (product) await notify(product.seller_id, 'message', 'Produto removido', `"${product.name}" foi removido por violar as regras da Watchhaul.`, '/seller/dashboard').run()
}

// Ends the live for everyone and takes it (and its recording) off the site
async function endStream(streamId: string) {
  await getDb().prepare(END_STREAM_SQL).bind(streamId).run()
  closeVideoRoom(streamId)
  broadcast(streamId, { t: 'status', status: 'ended' })
}

async function removeStream(streamId: string) {
  const db = getDb()
  const stream = await db
    .prepare(`UPDATE streams SET blocked_at = ${NOW} WHERE id = ? AND blocked_at IS NULL RETURNING host_id, title`)
    .bind(streamId)
    .first<{ host_id: string; title: string }>()
  if (!stream) return
  await endStream(streamId)
  await notify(stream.host_id, 'message', 'Live removida', `A live "${stream.title}" foi removida por violar as regras da Watchhaul.`, '/seller/dashboard').run()
}

async function removeMessage(messageId: string) {
  const message = await getDb()
    .prepare('DELETE FROM chat_messages WHERE id = ? RETURNING stream_id')
    .bind(messageId)
    .first<{ stream_id: string }>()
  if (message) broadcast(message.stream_id, { t: 'deleted', id: messageId })
}

export async function banUser(userId: string, reason: string) {
  const db = getDb()
  const bannedAt = new Date().toISOString()
  const banned = await db
    .prepare('UPDATE users SET banned_at = ?, banned_reason = ? WHERE id = ? AND banned_at IS NULL RETURNING email')
    .bind(bannedAt, reason, userId)
    .first<{ email: string | null }>()
  if (!banned) return
  const { results: lives } = await db
    .prepare(`SELECT id FROM streams WHERE host_id = ? AND status != 'ended'`)
    .bind(userId)
    .all<{ id: string }>()
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId),
    db.prepare('UPDATE products SET is_active = 0, blocked_at = ?1 WHERE seller_id = ?2 AND blocked_at IS NULL').bind(bannedAt, userId),
    db.prepare('UPDATE streams SET blocked_at = ?1 WHERE host_id = ?2 AND blocked_at IS NULL').bind(bannedAt, userId),
  ])
  await Promise.all(lives.map(l => endStream(l.id)))
}

// Brings back what the ban took down, and nothing removed for other reasons
export async function unbanUser(userId: string) {
  const db = getDb()
  const user = await db.prepare('SELECT banned_at FROM users WHERE id = ?').bind(userId).first<{ banned_at: string | null }>()
  if (!user?.banned_at) return
  await db.batch([
    db.prepare('UPDATE products SET is_active = 1, blocked_at = NULL WHERE seller_id = ?1 AND blocked_at = ?2').bind(userId, user.banned_at),
    db.prepare('UPDATE streams SET blocked_at = NULL WHERE host_id = ?1 AND blocked_at = ?2').bind(userId, user.banned_at),
    db.prepare('UPDATE users SET banned_at = NULL, banned_reason = NULL WHERE id = ?').bind(userId),
  ])
}

// dismiss: nothing wrong. remove: take the content down. ban: remove it and ban its owner.
// Other open reports about the same content are closed with it.
export async function resolveReport(adminId: string, reportId: string, action: 'dismiss' | 'remove' | 'ban') {
  const db = getDb()
  const report = await db
    .prepare(`SELECT target_type, target_id, target_user_id, reason FROM reports WHERE id = ? AND status = 'open'`)
    .bind(reportId)
    .first<{ target_type: ReportTarget; target_id: string; target_user_id: string | null; reason: ReportReason }>()
  if (!report) return 'not_found' as const

  if (action !== 'dismiss') {
    if (action === 'ban' && report.target_user_id) {
      // An admin can't be banned from here by accident (or through a report)
      if (await isAdmin(report.target_user_id)) return 'is_admin' as const
      await banUser(report.target_user_id, REPORT_REASONS[report.reason] ?? report.reason)
    }
    if (report.target_type === 'product') await removeProduct(report.target_id)
    else if (report.target_type === 'stream') await removeStream(report.target_id)
    else await removeMessage(report.target_id)
  }
  await db
    .prepare(
      `UPDATE reports SET status = ?, resolved_by = ?, resolved_at = ${NOW}
       WHERE status = 'open' AND target_type = ? AND target_id = ?`
    )
    .bind(action === 'dismiss' ? 'dismissed' : 'actioned', adminId, report.target_type, report.target_id)
    .run()
  return 'ok' as const
}

// ---------- Admin lists ----------

export interface AdminRefund {
  orderId: string
  // requested: the seller hasn't confirmed the return. failed: Asaas refused it.
  // banned_seller: paid and not shipped, by a seller who was banned
  kind: 'requested' | 'failed' | 'banned_seller'
  since: string | null
  total: number
  buyer: string
  buyerEmail: string | null
}

// Orders that need someone to step in
export async function getOrdersNeedingAction(): Promise<AdminRefund[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT o.id, o.total_cents, o.refund_status, o.refund_requested_at, o.refund_attempted_at, o.paid_at,
              u.name, u.email
       FROM orders o JOIN users u ON u.id = o.user_id
       WHERE o.refund_status IN ('requested', 'failed')
          OR (o.refund_status IS NULL AND o.status IN ('confirmed', 'processing') AND EXISTS (
                SELECT 1 FROM order_shipments s JOIN users seller ON seller.id = s.seller_id
                WHERE s.order_id = o.id AND s.shipped_at IS NULL AND seller.banned_at IS NOT NULL))
       ORDER BY o.created_at LIMIT 100`
    )
    .all<Record<string, any>>()
  return results.map(r => ({
    orderId: r.id,
    kind: r.refund_status ?? 'banned_seller',
    since: r.refund_requested_at ?? r.refund_attempted_at ?? r.paid_at,
    total: r.total_cents / 100,
    buyer: r.name,
    buyerEmail: r.email,
  }))
}

export async function getBannedUsers() {
  const { results } = await getDb()
    .prepare('SELECT id, name, email, banned_at, banned_reason FROM users WHERE banned_at IS NOT NULL ORDER BY banned_at DESC LIMIT 100')
    .all<{ id: string; name: string; email: string | null; banned_at: string; banned_reason: string | null }>()
  return results.map(u => ({ id: u.id, name: u.name, email: u.email, bannedAt: u.banned_at, reason: u.banned_reason }))
}
