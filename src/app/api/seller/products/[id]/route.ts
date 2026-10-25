import { requireSeller, updateProduct } from '@/lib/seller'
import { num, int, badRequest, readJson } from '@/lib/validate'

// Update price/stock, or pause/reactivate a product
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sellerId = await requireSeller()
  if (sellerId instanceof Response) return sellerId
  const { id } = await params

  const b = await readJson(request)
  if (!b) return badRequest('Dados inválidos')
  const price = b.price === undefined ? undefined : num(b.price, 0.01, 1_000_000)
  const stock = b.stock === undefined ? undefined : int(b.stock, 0, 100_000)
  const isActive = typeof b.isActive === 'boolean' ? b.isActive : undefined
  if (price === null || stock === null) return badRequest('Valores inválidos')

  const result = await updateProduct(sellerId, id, { price, stock, isActive })
  if (result === 'price_too_low') return badRequest('Com esse preço, uma variação ficaria sem valor')
  return result === 'ok' ? new Response(null, { status: 204 }) : new Response('Not found', { status: 404 })
}
