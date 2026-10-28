import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { videoToken, videoRoomOpen } from '@/lib/video'

// LiveKit token for a live's video. The host publishes while the live is on air; everyone
// else (signed in or not) watches. { url: null } means video isn't set up or the live isn't on.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [stream, session] = await Promise.all([
    getDb().prepare('SELECT host_id, status FROM streams WHERE id = ?').bind(id).first<{ host_id: string; status: string }>(),
    getSession(),
  ])
  if (!stream) return new Response('Not found', { status: 404 })
  const headers = { 'Cache-Control': 'no-store' }
  if (stream.status !== 'live') return Response.json({ url: null }, { headers })

  const isHost = session?.user.id === stream.host_id
  if (!isHost && !(await videoRoomOpen(id))) return Response.json({ url: null }, { headers })
  // A random suffix lets the same account watch from two tabs or devices
  const suffix = crypto.randomUUID().slice(0, 8)
  const access = await videoToken(id, {
    identity: isHost ? `host-${stream.host_id}` : session ? `user-${session.user.id}-${suffix}` : `viewer-${suffix}`,
    name: session?.user.name ?? 'Visitante',
    canPublish: isHost,
  })
  if (!access) return Response.json({ url: null }, { headers })
  return Response.json({ ...access, canPublish: isHost }, { headers })
}
