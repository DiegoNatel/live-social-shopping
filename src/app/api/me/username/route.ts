import { getSession } from '@/lib/auth'
import { changeUsername } from '@/lib/username'

// Changes the signed-in user's username: { username } → 200 { username } or 400 { message }
export async function PUT(request: Request) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  const body = (await request.json().catch(() => null)) as { username?: unknown } | null
  if (typeof body?.username !== 'string') return Response.json({ message: 'Informe o nome de usuário.' }, { status: 400 })

  const result = await changeUsername(session.user.id, body.username)
  if ('error' in result) return Response.json({ message: result.error }, { status: 400 })
  return Response.json({ username: result.username })
}
