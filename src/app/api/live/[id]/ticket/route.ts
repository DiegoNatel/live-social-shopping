import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { signTicket } from '@/realtime/ticket'
import { getCloudflareContext } from '@opennextjs/cloudflare'

// Ticket for joining a live room's WebSocket as the signed-in user.
// Signed-out viewers get { ticket: null } and join read-only.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Response.json({ ticket: null })

  const db = getDb()
  const [stream, user] = await Promise.all([
    db.prepare('SELECT host_id FROM streams WHERE id = ?').bind(id).first<{ host_id: string }>(),
    db
      .prepare('SELECT name, username, avatar, is_verified FROM users WHERE id = ?')
      .bind(session.user.id)
      .first<{ name: string; username: string; avatar: string | null; is_verified: number }>(),
  ])
  if (!stream || !user) return new Response('Not found', { status: 404 })

  const ticket = await signTicket(
    {
      sid: id,
      uid: session.user.id,
      name: user.name,
      username: user.username,
      avatar: user.avatar ?? '',
      verified: !!user.is_verified,
      host: stream.host_id === session.user.id,
    },
    getCloudflareContext().env.BETTER_AUTH_SECRET
  )
  return Response.json({ ticket }, { headers: { 'Cache-Control': 'no-store' } })
}
