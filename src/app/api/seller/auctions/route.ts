import { requireSeller, createAuction } from '@/lib/seller'
import { str, num, int, isoDate, badRequest, readJson } from '@/lib/validate'

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
  return id ? Response.json({ id }, { status: 201 }) : new Response('Product not found', { status: 404 })
}
