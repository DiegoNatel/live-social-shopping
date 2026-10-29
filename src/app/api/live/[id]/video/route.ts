import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { videoToken } from '@/lib/video'
import { HOST_IDENTITY_PREFIX } from '@/lib/livekit'

// LiveKit token for a live's video. The host publishes while the live is on air; everyone
// else (signed in or not) watches. { url: null } means video isn't set up or the live isn't on.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [stream, session] = await Promise.all([
    getDb()
      .prepare('SELECT host_id, status, video_room FROM streams WHERE id = ?')
      .bind(id)
      .first<{ host_id: string; status: string; video_room: number }>(),
    getSession(),
  ])
  if (!stream) return new Response('Not found', { status: 404 })
  const headers = { 'Cache-Control': 'no-store' }
  if (stream.status !== 'live') return Response.json({ url: null }, { headers })

  const isHost = session?.user.id === stream.host_id
  // Viewers only join a live whose room was opened, so lives without video (e.g. LiveKit was
  // down when it started) keep their cover image and don't use LiveKit minutes
  if (!isHost && !stream.video_room) return Response.json({ url: null }, { headers })
  // A random suffix lets the same account watch from two tabs or devices
  const suffix = crypto.randomUUID().slice(0, 8)
  const access = await videoToken(id, {
    identity: isHost ? `${HOST_IDENTITY_PREFIX}${stream.host_id}` : session ? `user-${session.user.id}-${suffix}` : `viewer-${suffix}`,
    name: session?.user.name ?? 'Visitante',
    canPublish: isHost,
  })
  if (!access) return Response.json({ url: null }, { headers })
  return Response.json({ ...access, canPublish: isHost }, { headers })
}
