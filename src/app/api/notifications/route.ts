import { getSession } from '@/lib/auth'
import { getNotifications, markNotificationsRead, clearNotifications } from '@/lib/engagement'
import { str, readJson } from '@/lib/validate'

export async function GET() {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  return Response.json(await getNotifications(session.user.id))
}

// { id } marks one as read; {} marks all as read
export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  const id = str((await readJson(request))?.id, 64) ?? undefined
  await markNotificationsRead(session.user.id, id)
  return new Response(null, { status: 204 })
}

export async function DELETE() {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  await clearNotifications(session.user.id)
  return new Response(null, { status: 204 })
}
