import { requireSeller, createProduct } from '@/lib/seller'
import { badRequest, readJson } from '@/lib/validate'
import { parseProductBody } from '@/lib/product-input'

export async function POST(request: Request) {
  const sellerId = await requireSeller()
  if (sellerId instanceof Response) return sellerId

  const b = await readJson(request)
  if (!b) return badRequest('Dados inválidos')
  const product = parseProductBody(b)
  if (product instanceof Response) return product

  const id = await createProduct(sellerId, product)
  return Response.json({ id }, { status: 201 })
}
