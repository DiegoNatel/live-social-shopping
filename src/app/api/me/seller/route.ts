import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

// Turns the signed-in account into a seller account
export async function POST() {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  await getDb().prepare('UPDATE users SET is_seller = 1 WHERE id = ?').bind(session.user.id).run()
  return new Response(null, { status: 204 })
}
