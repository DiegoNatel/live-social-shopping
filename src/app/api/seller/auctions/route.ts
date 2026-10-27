import { requireSeller, createAuction } from '@/lib/seller'
import { str, num, int, isoDate, badRequest, readJson } from '@/lib/validate'
import { getDb } from '@/lib/db'
import { getStreamAuctions } from '@/lib/engagement'
import { broadcast, scheduleAuctionClose } from '@/lib/live'

export async function POST(request: Request) {
  const sellerId = await requireSeller()
  if (sellerId instanceof Response) return sellerId

  const b = await readJson(request)
  if (!b) return badRequest('Dados inválidos')
  const productId = str(b.productId, 64)
  const startingPrice = num(b.startingPrice, 0.01, 1_000_000)
  const minimumIncrement = num(b.minimumIncrement, 0.01, 100_000)
  const durationMinutes = int(b.durationMinutes, 1, 7 * 24 * 60)
  const startsAt = b.startsAt === 'now' ? new Date().toISOString() : isoDate(b.startsAt)
  if (!productId || startingPrice === null || minimumIncrement === null || durationMinutes === null || !startsAt) {
    return badRequest('Dados do leilão incompletos')
  }

  const id = await createAuction(sellerId, {
    productId,
    startingPrice,
    minimumIncrement,
    durationMinutes,
    startsAt,
    streamId: str(b.streamId, 64) ?? undefined,
  })
  if (id === 'NOT_FOUND') return new Response('Product not found', { status: 404 })
  if (id === 'STREAM_FORBIDDEN') {
    return Response.json({ message: 'Você só pode criar leilões nas suas lives ou nas que aceitou convite' }, { status: 403 })
  }

  // The room closes the auction at its end and shows it to viewers right away
  const auction = await getDb()
    .prepare('SELECT stream_id, ends_at FROM auctions WHERE id = ?')
    .bind(id)
    .first<{ stream_id: string | null; ends_at: string }>()
  if (auction) {
    scheduleAuctionClose({ id, streamId: auction.stream_id, endsAt: auction.ends_at })
    if (auction.stream_id) {
      const created = (await getStreamAuctions(auction.stream_id, [])).find(a => a.id === id)
      if (created) broadcast(auction.stream_id, { t: 'auction', auction: created })
    }
  }
  return Response.json({ id }, { status: 201 })
}
