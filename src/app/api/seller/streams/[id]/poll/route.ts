import { requireSeller } from '@/lib/seller'
import { startPoll, endPoll } from '@/lib/host-tools'
import { getActivePoll } from '@/lib/engagement'
import { broadcast } from '@/lib/live'
import { str, int, badRequest, readJson } from '@/lib/validate'

type Params = { params: Promise<{ id: string }> }

// { question, options: string[2..4], durationMinutes? }
export async function POST(request: Request, { params }: Params) {
  const sellerId = await requireSeller()
  if (sellerId instanceof Response) return sellerId
  const { id } = await params
  const b = await readJson(request)
  const question = str(b?.question, 140)
  const options = Array.isArray(b?.options) ? b.options.map(o => str(o, 60)).filter((o): o is string => !!o) : []
  const duration = b?.durationMinutes ? int(b.durationMinutes, 1, 120) : undefined
  if (!question || options.length < 2 || options.length > 4 || duration === null) {
    return badRequest('Escreva a pergunta e de 2 a 4 opções')
  }
  if (!(await startPoll(sellerId, id, question, options, duration))) return new Response('Not found', { status: 404 })
  broadcast(id, { t: 'poll', poll: await getActivePoll(id) })
  return new Response(null, { status: 201 })
}

export async function DELETE(_request: Request, { params }: Params) {
  const sellerId = await requireSeller()
  if (sellerId instanceof Response) return sellerId
  const { id } = await params
  if (!(await endPoll(sellerId, id))) return new Response('Not found', { status: 404 })
  broadcast(id, { t: 'poll', poll: null })
  return new Response(null, { status: 204 })
}
