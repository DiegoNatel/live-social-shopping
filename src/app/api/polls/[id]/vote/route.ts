import { getSession } from '@/lib/auth'
import { votePoll } from '@/lib/engagement'
import { str, badRequest, readJson } from '@/lib/validate'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  const { id } = await params

  const b = await readJson(request)
  const optionId = str(b?.optionId, 64)
  if (!optionId) return badRequest('Opção inválida')

  const ok = await votePoll(session.user.id, id, optionId)
  return ok ? new Response(null, { status: 204 }) : new Response('Not found', { status: 404 })
}
