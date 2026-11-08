import { requireSeller, updateProduct, replaceProduct } from '@/lib/seller'
import { money, int, badRequest, readJson } from '@/lib/validate'
import { INVALID_PRICE_MESSAGE } from '@/lib/money'
import { parseProductBody } from '@/lib/product-input'

// Update price/stock, or pause/reactivate a product
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sellerId = await requireSeller()
  if (sellerId instanceof Response) return sellerId
  const { id } = await params

  const b = await readJson(request)
  if (!b) return badRequest('Dados inválidos')
  const price = b.price === undefined ? undefined : money(b.price, 0.01, 1_000_000)
  const stock = b.stock === undefined ? undefined : int(b.stock, 0, 100_000)
  const isActive = typeof b.isActive === 'boolean' ? b.isActive : undefined
  if (price === null) return badRequest(INVALID_PRICE_MESSAGE)
  if (stock === null) return badRequest('Estoque inválido: use um número inteiro de 0 a 100.000')

  const result = await updateProduct(sellerId, id, { price, stock, isActive })
  if (result === 'price_too_low') return badRequest('Com esse preço, uma variação ficaria sem valor')
  return result === 'ok' ? new Response(null, { status: 204 }) : new Response('Not found', { status: 404 })
}

// Edit everything: name, description, price, stock, category, photos, tags, variants, package
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sellerId = await requireSeller()
  if (sellerId instanceof Response) return sellerId
  const { id } = await params

  const b = await readJson(request)
  if (!b) return badRequest('Dados inválidos')
  const product = parseProductBody(b)
  if (product instanceof Response) return product

  const result = await replaceProduct(sellerId, id, product)
  if (result === 'blocked') return badRequest('Este produto foi removido pela moderação e não pode ser editado')
  return result === 'ok' ? new Response(null, { status: 204 }) : new Response('Not found', { status: 404 })
}
