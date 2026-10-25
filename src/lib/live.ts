import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { roomName, type RoomCommand, type ServerMessage } from '@/realtime/protocol'

// Sends a command to a live room without delaying the API response. Best effort: the
// database is the source of truth, so a missed event only means a viewer refreshes.
// (Under `next dev` there is no Durable Object, so this does nothing.)
export function sendToRoom(room: string, cmd: RoomCommand) {
  try {
    const { env, ctx } = getCloudflareContext()
    if (!env.LIVE_ROOM) return
    const stub = env.LIVE_ROOM.get(env.LIVE_ROOM.idFromName(room))
    const done = stub
      .fetch('https://live-room/event', { method: 'POST', body: JSON.stringify(cmd) })
      .catch(e => console.error('live room event failed', room, e))
    ctx.waitUntil(done)
  } catch (e) {
    console.error('live room unavailable', e)
  }
}

export const broadcast = (streamId: string, msg: ServerMessage) => sendToRoom(streamId, { broadcast: msg })

export function scheduleAuctionClose(auction: { id: string; streamId?: string | null; endsAt: string }) {
  sendToRoom(roomName(auction.streamId, auction.id), { scheduleAuction: { id: auction.id, endsAt: auction.endsAt } })
}
