import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

const VISITOR_ID = /^[0-9a-f-]{36}$/

// A browser counting its visit for the day: { visitorId }. See SessionSync.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { visitorId?: unknown } | null
  const visitorId = typeof body?.visitorId === 'string' && VISITOR_ID.test(body.visitorId) ? body.visitorId : null
  if (!visitorId) return new Response('Bad request', { status: 400 })
  const session = await getSession()
  await getDb()
    .prepare(
      `INSERT INTO visits (day, visitor_id, user_id) VALUES (date('now', '-3 hours'), ?1, ?2)
       ON CONFLICT (day, visitor_id) DO UPDATE SET user_id = coalesce(excluded.user_id, user_id)`
    )
    .bind(visitorId, session?.user.id ?? null)
    .run()
  return new Response(null, { status: 204 })
}
