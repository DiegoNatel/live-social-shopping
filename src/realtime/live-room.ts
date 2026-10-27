// One LiveRoom Durable Object per live stream (named by stream id). It holds the viewers'
// WebSockets (hibernating, so idle viewers cost nothing), relays chat and reactions,
// counts viewers, and closes the stream's auctions when they end.
// Runs in the Worker (see worker.ts), outside Next.js: it talks to D1 directly.
import { DurableObject } from 'cloudflare:workers'
import { CHAT_MAX_LENGTH, REACTION_EMOJIS, type ClientMessage, type RoomCommand, type ServerMessage } from './protocol'
import { verifyTicket } from './ticket'
import type { ChatMessage, User } from '@/types'

interface Viewer {
  user: User | null // null = watching without an account
  host: boolean
  chatTimes: number[] // recent message times, for rate limiting
  reactTimes: number[]
}

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
const VIEWER_FLUSH_MS = 2000
const CHAT_LIMIT = { count: 5, perMs: 10_000 } // 5 messages per 10 s
const REACT_LIMIT = { count: 10, perMs: 2_000 }
// Connections from one IP to one live; keeps the viewer count honest while leaving room
// for a family or office sharing a connection
const MAX_SOCKETS_PER_IP = 10

const within = (times: number[], perMs: number, now: number) => times.filter(t => now - t < perMs)

export class LiveRoom extends DurableObject<CloudflareEnv> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/ws') return this.acceptViewer(request, url)
    if (url.pathname === '/event' && request.method === 'POST') {
      await this.handleCommand((await request.json()) as RoomCommand)
      return new Response(null, { status: 204 })
    }
    return new Response('Not found', { status: 404 })
  }

  // ---------- Connections ----------

  private async acceptViewer(request: Request, url: URL) {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 })
    const streamId = url.searchParams.get('stream')
    if (!streamId) return new Response('Missing stream', { status: 400 })

    let viewer: Viewer = { user: null, host: false, chatTimes: [], reactTimes: [] }
    const ticket = url.searchParams.get('ticket')
    if (ticket) {
      const t = await verifyTicket(ticket, this.env.BETTER_AUTH_SECRET)
      if (!t || t.sid !== streamId) return new Response('Invalid ticket', { status: 401 })
      viewer = {
        user: { id: t.uid, name: t.name, username: t.username, avatar: t.avatar, isVerified: t.verified, followers: 0, following: 0 },
        host: t.host,
        chatTimes: [],
        reactTimes: [],
      }
    }
    await this.ctx.storage.put('streamId', streamId)
    await this.trackOpenAuctions(streamId)

    // Set by Cloudflare's edge (absent in some local setups)
    const ip = request.headers.get('CF-Connecting-IP')
    const tags = ip ? [`ip:${ip}`] : []
    if (ip && this.ctx.getWebSockets(`ip:${ip}`).filter(ws => ws.readyState === WebSocket.OPEN).length >= MAX_SOCKETS_PER_IP) {
      return new Response('Too many connections', { status: 429 })
    }

    const { 0: client, 1: server } = new WebSocketPair()
    this.ctx.acceptWebSocket(server, tags)
    server.serializeAttachment(viewer)
    this.send(server, {
      t: 'hello',
      viewers: this.openSockets().length,
      messages: await this.recentMessages(streamId),
      canChat: !!viewer.user,
      isHost: viewer.host,
    })
    await this.scheduleViewerFlush()
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer) {
    if (typeof data !== 'string' || data.length > 2000) return
    let msg: ClientMessage
    try {
      msg = JSON.parse(data)
    } catch {
      return
    }
    const viewer = ws.deserializeAttachment() as Viewer
    const now = Date.now()

    if (msg.t === 'chat') {
      if (!viewer.user) return this.send(ws, { t: 'error', message: 'Entre na sua conta para participar do chat' })
      const text = typeof msg.text === 'string' ? msg.text.trim().slice(0, CHAT_MAX_LENGTH) : ''
      if (!text) return
      viewer.chatTimes = within(viewer.chatTimes, CHAT_LIMIT.perMs, now)
      if (viewer.chatTimes.length >= CHAT_LIMIT.count) {
        return this.send(ws, { t: 'error', message: 'Calma! Espere alguns segundos para mandar outra mensagem.' })
      }
      viewer.chatTimes.push(now)
      ws.serializeAttachment(viewer)

      const message: ChatMessage = {
        id: crypto.randomUUID(),
        user: viewer.user,
        message: text,
        timestamp: new Date(now).toISOString(),
        type: 'text',
      }
      const streamId = await this.streamId()
      await this.env.DB.prepare(
        'INSERT INTO chat_messages (id, stream_id, user_id, message, type, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(message.id, streamId, viewer.user.id, text, 'text', message.timestamp)
        .run()
      this.broadcast({ t: 'chat', message })
      return
    }

    if (msg.t === 'react') {
      if (!viewer.user || !REACTION_EMOJIS.includes(msg.emoji)) return
      viewer.reactTimes = within(viewer.reactTimes, REACT_LIMIT.perMs, now)
      if (viewer.reactTimes.length >= REACT_LIMIT.count) return
      viewer.reactTimes.push(now)
      ws.serializeAttachment(viewer)
      // Hearts count as likes on the stream (saved with the viewer count)
      if (msg.emoji === '❤️') {
        await this.ctx.storage.put('pendingLikes', ((await this.ctx.storage.get<number>('pendingLikes')) ?? 0) + 1)
        await this.scheduleViewerFlush()
      }
      this.broadcast({ t: 'react', emoji: msg.emoji }, ws)
      return
    }

    if (msg.t === 'delete') {
      if (!viewer.host || typeof msg.id !== 'string') return
      await this.env.DB.prepare('DELETE FROM chat_messages WHERE id = ? AND stream_id = ?')
        .bind(msg.id, await this.streamId())
        .run()
      this.broadcast({ t: 'deleted', id: msg.id })
    }
  }

  async webSocketClose(ws: WebSocket, code: number) {
    try {
      ws.close(code === 1005 ? 1000 : code)
    } catch {
      // already closed
    }
    await this.scheduleViewerFlush()
  }

  async webSocketError() {
    await this.scheduleViewerFlush()
  }

  // ---------- Commands from the Next API routes ----------

  private async handleCommand(cmd: RoomCommand) {
    if (cmd.broadcast) this.broadcast(cmd.broadcast)
    if (cmd.scheduleAuction) {
      await this.ctx.storage.put(`auction:${cmd.scheduleAuction.id}`, Date.parse(cmd.scheduleAuction.endsAt))
      await this.scheduleAlarm(Date.parse(cmd.scheduleAuction.endsAt))
    }
  }

  // ---------- Alarm: viewer counts, likes and auction endings ----------

  async alarm() {
    const now = Date.now()
    if (await this.ctx.storage.get<boolean>('viewersDirty')) {
      await this.ctx.storage.put('viewersDirty', false)
      const count = this.openSockets().length
      this.broadcast({ t: 'viewers', count })
      const likes = (await this.ctx.storage.get<number>('pendingLikes')) ?? 0
      await this.ctx.storage.put('pendingLikes', 0)
      const streamId = await this.ctx.storage.get<string>('streamId')
      if (streamId) {
        // Only while live: ending a stream resets its count to 0
        await this.env.DB.prepare(
          `UPDATE streams SET viewer_count = CASE WHEN status = 'live' THEN ? ELSE viewer_count END, likes = likes + ? WHERE id = ?`
        )
          .bind(count, likes, streamId)
          .run()
      }
    }

    const auctions = await this.ctx.storage.list<number>({ prefix: 'auction:' })
    for (const [key, endsAt] of auctions) {
      if (endsAt <= now) await this.closeAuction(key.slice('auction:'.length), key)
    }
    await this.rescheduleAlarm()
  }

  // Picks the winner once the auction has really ended (bids near the end extend it)
  private async closeAuction(auctionId: string, storageKey: string) {
    const db = this.env.DB
    const auction = await db
      .prepare(
        `SELECT a.id, a.ends_at, a.winner_id, a.current_bid_cents, p.name AS product_name, p.seller_id
         FROM auctions a JOIN products p ON p.id = a.product_id WHERE a.id = ?`
      )
      .bind(auctionId)
      .first<Record<string, any>>()
    if (!auction || auction.winner_id) return this.ctx.storage.delete(storageKey)
    if (Date.parse(auction.ends_at) > Date.now()) {
      // Extended by a late bid: check again at the new end
      return this.ctx.storage.put(storageKey, Date.parse(auction.ends_at))
    }

    const top = await db
      .prepare(
        `SELECT b.user_id, b.amount_cents, u.name, u.username, u.avatar, u.is_verified
         FROM bids b JOIN users u ON u.id = b.user_id
         WHERE b.auction_id = ? ORDER BY b.amount_cents DESC, b.created_at LIMIT 1`
      )
      .bind(auctionId)
      .first<Record<string, any>>()
    const amount = (top?.amount_cents ?? auction.current_bid_cents) / 100
    const price = `R$ ${amount.toFixed(2).replace('.', ',')}`

    const closed = await db
      .prepare(`UPDATE auctions SET status = 'ended', winner_id = ? WHERE id = ? AND winner_id IS NULL AND ends_at <= ${NOW}`)
      .bind(top?.user_id ?? null, auctionId)
      .run()
    await this.ctx.storage.delete(storageKey)
    if (closed.meta.changes === 0) return

    const notify = (userId: string, title: string, message: string, actionUrl: string) =>
      db
        .prepare(`INSERT INTO notifications (id, user_id, type, title, message, action_url) VALUES (?, ?, 'message', ?, ?, ?)`)
        .bind(crypto.randomUUID(), userId, title, message, actionUrl)
    await db.batch([
      notify(
        auction.seller_id,
        'Leilão encerrado',
        top ? `${auction.product_name} foi arrematado por ${price}.` : `${auction.product_name} terminou sem lances.`,
        '/seller/dashboard'
      ),
      ...(top
        ? [
            notify(
              top.user_id,
              'Você venceu o leilão! 🎉',
              `Você arrematou ${auction.product_name} por ${price}. Finalize a compra.`,
              `/auctions/${auctionId}`
            ),
          ]
        : []),
    ])

    this.broadcast({
      t: 'auction_end',
      auctionId,
      amount,
      winner: top
        ? { id: top.user_id, name: top.name, username: top.username, avatar: top.avatar ?? '', isVerified: !!top.is_verified, followers: 0, following: 0 }
        : null,
    })
  }

  // Auctions created before the room existed (or seeded) get their closing alarm here
  private async trackOpenAuctions(streamId: string) {
    if (await this.ctx.storage.get<boolean>('auctionsTracked')) return
    const { results } = await this.env.DB.prepare(
      `SELECT id, ends_at FROM auctions WHERE stream_id = ? AND status != 'ended' AND winner_id IS NULL`
    )
      .bind(streamId)
      .all<{ id: string; ends_at: string }>()
    for (const a of results) {
      await this.ctx.storage.put(`auction:${a.id}`, Date.parse(a.ends_at))
      await this.scheduleAlarm(Date.parse(a.ends_at))
    }
    await this.ctx.storage.put('auctionsTracked', true)
  }

  // ---------- Helpers ----------

  private openSockets() {
    return this.ctx.getWebSockets().filter(ws => ws.readyState === WebSocket.OPEN)
  }

  private send(ws: WebSocket, msg: ServerMessage) {
    try {
      ws.send(JSON.stringify(msg))
    } catch {
      // socket closing
    }
  }

  private broadcast(msg: ServerMessage, except?: WebSocket) {
    const data = JSON.stringify(msg)
    for (const ws of this.openSockets()) {
      if (ws === except) continue
      try {
        ws.send(data)
      } catch {
        // socket closing
      }
    }
  }

  private async streamId() {
    return (await this.ctx.storage.get<string>('streamId'))!
  }

  private async recentMessages(streamId: string): Promise<ChatMessage[]> {
    const { results } = await this.env.DB.prepare(
      `SELECT * FROM (
         SELECT m.id, m.message, m.type, m.is_pinned, m.created_at,
                u.id AS user_id, u.name, u.username, u.avatar, u.is_verified
         FROM chat_messages m JOIN users u ON u.id = m.user_id
         WHERE m.stream_id = ? ORDER BY m.created_at DESC LIMIT 50
       ) ORDER BY created_at`
    )
      .bind(streamId)
      .all<Record<string, any>>()
    return results.map(r => ({
      id: r.id,
      message: r.message,
      type: r.type,
      isPinned: !!r.is_pinned,
      timestamp: r.created_at,
      user: { id: r.user_id, name: r.name, username: r.username, avatar: r.avatar ?? '', isVerified: !!r.is_verified, followers: 0, following: 0 },
    }))
  }

  // Viewer counts are sent at most every couple of seconds, however many people join
  private async scheduleViewerFlush() {
    await this.ctx.storage.put('viewersDirty', true)
    await this.scheduleAlarm(Date.now() + VIEWER_FLUSH_MS)
  }

  private async scheduleAlarm(at: number) {
    const current = await this.ctx.storage.getAlarm()
    if (current === null || at < current) await this.ctx.storage.setAlarm(at)
  }

  private async rescheduleAlarm() {
    const times: number[] = []
    if (await this.ctx.storage.get<boolean>('viewersDirty')) times.push(Date.now() + VIEWER_FLUSH_MS)
    for (const endsAt of (await this.ctx.storage.list<number>({ prefix: 'auction:' })).values()) times.push(endsAt)
    if (times.length) await this.ctx.storage.setAlarm(Math.max(Date.now(), Math.min(...times)))
  }
}
