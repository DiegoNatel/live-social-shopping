import { getSession } from '@/lib/auth'
import { setInterests } from '@/lib/db'

export async function PUT(request: Request) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const body = (await request.json().catch(() => null)) as { interests?: unknown } | null
  const interests = Array.isArray(body?.interests)
    ? body.interests.filter((i): i is string => typeof i === 'string').slice(0, 50)
    : null
  if (!interests) return new Response('Bad request', { status: 400 })

  await setInterests(session.user.id, interests)
  return new Response(null, { status: 204 })
}
