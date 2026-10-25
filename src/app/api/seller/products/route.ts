import { requireSeller, createProduct, type ProductInput } from '@/lib/seller'
import { str, num, int, strList, imageUrls, badRequest, readJson } from '@/lib/validate'

export async function POST(request: Request) {
  const sellerId = await requireSeller()
  if (sellerId instanceof Response) return sellerId

  const b = await readJson(request)
  if (!b) return badRequest('Dados inválidos')
  const name = str(b.name, 120)
  const price = num(b.price, 0.01, 1_000_000)
  const stock = int(b.stock, 0, 100_000)
  const category = str(b.category, 40)
  const images = imageUrls(b.images, 8)
  if (!name || price === null || stock === null || !category) return badRequest('Preencha nome, preço, estoque e categoria')
  if (images.length === 0) return badRequest('Adicione pelo menos uma imagem')
  const originalPrice = b.originalPrice ? num(b.originalPrice, price, 1_000_000) : undefined
  if (originalPrice === null) return badRequest('O preço original deve ser maior que o preço')

  // Sizes and colors, each with its own stock and an optional price difference
  const variants: ProductInput['variants'] = []
  for (const v of Array.isArray(b.variants) ? b.variants.slice(0, 20) : []) {
    const type = v?.type === 'size' || v?.type === 'color' ? v.type : null
    const vName = str(v?.name, 30)
    const vStock = int(v?.stock, 0, 100_000)
    const priceModifier = v?.priceModifier ? num(v.priceModifier, 0.01 - price, 1_000_000) : 0
    const value = type === 'color' ? str(v?.value, 7) : vName
    if (!type || !vName || vStock === null || priceModifier === null) return badRequest('Variação inválida')
    if (type === 'color' && !/^#[0-9a-f]{6}$/i.test(value ?? '')) return badRequest(`Cor inválida: ${vName}`)
    if (variants.some(x => x.type === type && x.name.toLowerCase() === vName.toLowerCase())) {
      return badRequest(`Variação repetida: ${vName}`)
    }
    variants.push({ type, name: vName, value: value!, stock: vStock, priceModifier })
  }

  const id = await createProduct(sellerId, {
    name,
    description: str(b.description, 2000) ?? '',
    price,
    originalPrice,
    stock,
    category,
    images,
    tags: strList(b.tags, 10, 30),
    variants,
  })
  return Response.json({ id }, { status: 201 })
}
