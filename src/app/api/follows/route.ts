import { getSession } from '@/lib/auth'
import { getUser, setFollow } from '@/lib/db'

async function handle(request: Request, follow: boolean) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const body = (await request.json().catch(() => null)) as { hostId?: unknown } | null
  const hostId = typeof body?.hostId === 'string' ? body.hostId : null
  if (!hostId || hostId === session.user.id) return new Response('Bad request', { status: 400 })
  if (!(await getUser(hostId))) return new Response('Not found', { status: 404 })

  await setFollow(session.user.id, hostId, follow)
  return new Response(null, { status: 204 })
}

export const POST = (request: Request) => handle(request, true)
export const DELETE = (request: Request) => handle(request, false)
