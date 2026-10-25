import { getSession } from '@/lib/auth'
import { getActivePoll, votePoll } from '@/lib/engagement'
import { broadcast } from '@/lib/live'
import { str, badRequest, readJson } from '@/lib/validate'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  const { id } = await params

  const b = await readJson(request)
  const optionId = str(b?.optionId, 64)
  if (!optionId) return badRequest('Opção inválida')

  const streamId = await votePoll(session.user.id, id, optionId)
  if (!streamId) return new Response('Not found', { status: 404 })
  // Everyone in the live sees the new totals
  broadcast(streamId, { t: 'poll', poll: await getActivePoll(streamId) })
  return new Response(null, { status: 204 })
}
