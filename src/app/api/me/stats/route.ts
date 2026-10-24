import { getSession } from '@/lib/auth'
import { getPurchaseStats } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  return Response.json(await getPurchaseStats(session.user.id))
}
