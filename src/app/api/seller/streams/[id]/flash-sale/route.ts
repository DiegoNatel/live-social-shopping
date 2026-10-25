import { requireSeller } from '@/lib/seller'
import { startFlashSale, endFlashSale } from '@/lib/host-tools'
import { getActiveFlashSale } from '@/lib/engagement'
import { broadcast } from '@/lib/live'
import { str, int, badRequest, readJson } from '@/lib/validate'

type Params = { params: Promise<{ id: string }> }

// { productId, discountPercent 1..90, durationMinutes 1..120, quantity }
export async function POST(request: Request, { params }: Params) {
  const sellerId = await requireSeller()
  if (sellerId instanceof Response) return sellerId
  const { id } = await params
  const b = await readJson(request)
  const productId = str(b?.productId, 64)
  const discountPercent = int(b?.discountPercent, 1, 90)
  const durationMinutes = int(b?.durationMinutes, 1, 120)
  const quantity = int(b?.quantity, 1, 10_000)
  if (!productId || discountPercent === null || durationMinutes === null || quantity === null) {
    return badRequest('Escolha produto, desconto (1 a 90%), duração e quantidade')
  }
  const result = await startFlashSale(sellerId, id, { productId, discountPercent, durationMinutes, quantity })
  if (result === 'not_enough_stock') return badRequest('Quantidade maior que o estoque do produto')
  if (result !== 'ok') return new Response('Not found', { status: 404 })
  broadcast(id, { t: 'flash', flashSale: await getActiveFlashSale(id) })
  return new Response(null, { status: 201 })
}

export async function DELETE(_request: Request, { params }: Params) {
  const sellerId = await requireSeller()
  if (sellerId instanceof Response) return sellerId
  const { id } = await params
  if (!(await endFlashSale(sellerId, id))) return new Response('Not found', { status: 404 })
  broadcast(id, { t: 'flash', flashSale: null })
  return new Response(null, { status: 204 })
}
