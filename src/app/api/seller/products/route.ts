import { requireSeller, createProduct } from '@/lib/seller'
import { str, num, int, strList, httpsUrls, badRequest, readJson } from '@/lib/validate'

export async function POST(request: Request) {
  const sellerId = await requireSeller()
  if (sellerId instanceof Response) return sellerId

  const b = await readJson(request)
  if (!b) return badRequest('Dados inválidos')
  const name = str(b.name, 120)
  const price = num(b.price, 0.01, 1_000_000)
  const stock = int(b.stock, 0, 100_000)
  const category = str(b.category, 40)
  const images = httpsUrls(b.images, 8)
  if (!name || price === null || stock === null || !category) return badRequest('Preencha nome, preço, estoque e categoria')
  if (images.length === 0) return badRequest('Adicione pelo menos uma imagem (URL https)')
  const originalPrice = b.originalPrice ? num(b.originalPrice, price, 1_000_000) : undefined
  if (originalPrice === null) return badRequest('O preço original deve ser maior que o preço')

  const id = await createProduct(sellerId, {
    name,
    description: str(b.description, 2000) ?? '',
    price,
    originalPrice,
    stock,
    category,
    images,
    tags: strList(b.tags, 10, 30),
  })
  return Response.json({ id }, { status: 201 })
}
