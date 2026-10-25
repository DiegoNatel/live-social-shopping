import { getSession } from '@/lib/auth'
import { placeBid } from '@/lib/engagement'
import { num, badRequest, readJson } from '@/lib/validate'
import { broadcast } from '@/lib/live'

const MESSAGES = {
  NOT_FOUND: 'Leilão não encontrado',
  CLOSED: 'Este leilão não está aberto',
  TOO_LOW: 'Seu lance precisa ser maior',
  OWN_AUCTION: 'Você não pode dar lances no seu próprio leilão',
} as const

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  const { id } = await params

  const b = await readJson(request)
  const amount = num(b?.amount, 0.01, 10_000_000)
  if (amount === null) return badRequest('Valor inválido')

  const result = await placeBid(session.user.id, id, amount)
  if (result.ok) {
    if (result.streamId) {
      broadcast(result.streamId, { t: 'bid', auctionId: id, currentBid: result.currentBid, endTime: result.endTime, bid: result.bid })
    }
    return Response.json({ currentBid: result.currentBid, endTime: result.endTime }, { status: 201 })
  }
  const status = result.reason === 'NOT_FOUND' ? 404 : result.reason === 'OWN_AUCTION' ? 403 : 409
  return Response.json({ ...result, message: MESSAGES[result.reason] }, { status })
}
