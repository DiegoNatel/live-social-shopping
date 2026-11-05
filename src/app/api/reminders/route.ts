import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

// "Lembrar-me" on a scheduled live (POST sets it, DELETE removes it). The reminder goes out
// when the seller goes live (setStreamStatus in lib/seller.ts).
async function handle(request: Request, remind: boolean) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const body = (await request.json().catch(() => null)) as { streamId?: unknown } | null
  const streamId = typeof body?.streamId === 'string' ? body.streamId : null
  if (!streamId) return new Response('Bad request', { status: 400 })

  const db = getDb()
  if (!remind) {
    await db.prepare('DELETE FROM stream_reminders WHERE stream_id = ? AND user_id = ?').bind(streamId, session.user.id).run()
    return new Response(null, { status: 204 })
  }
  const stream = await db
    .prepare('SELECT status, host_id FROM streams WHERE id = ? AND blocked_at IS NULL')
    .bind(streamId)
    .first<{ status: string; host_id: string }>()
  if (!stream) return new Response('Not found', { status: 404 })
  if (stream.status !== 'scheduled') return Response.json({ message: 'Esta live já começou ou terminou' }, { status: 409 })
  if (stream.host_id === session.user.id) return new Response('Bad request', { status: 400 })

  await db
    .prepare('INSERT OR IGNORE INTO stream_reminders (stream_id, user_id) VALUES (?, ?)')
    .bind(streamId, session.user.id)
    .run()
  return new Response(null, { status: 204 })
}

export const POST = (request: Request) => handle(request, true)
export const DELETE = (request: Request) => handle(request, false)
