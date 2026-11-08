import 'server-only'
import type { ProductInput } from './seller'
import { str, money, int, strList, imageUrls, badRequest } from './validate'
import { INVALID_PRICE_MESSAGE } from './money'

// The full product as sent by the product form, for creating and for editing. Variants that
// already exist carry their id, so editing keeps them (and their stock) instead of recreating.
// Returns the product, or a 400 Response naming what's wrong.
export function parseProductBody(b: Record<string, unknown>): ProductInput | Response {
  const name = str(b.name, 120)
  if (!name) return badRequest('Dê um nome ao produto')
  const price = money(b.price, 0.01, 1_000_000)
  if (price === null) return badRequest(INVALID_PRICE_MESSAGE)
  const stock = int(b.stock, 0, 100_000)
  if (stock === null) return badRequest('Estoque inválido: use um número inteiro de 0 a 100.000')
  const category = str(b.category, 40)
  if (!category) return badRequest('Escolha uma categoria')
  const images = imageUrls(b.images, 8)
  if (images.length === 0) return badRequest('Adicione pelo menos uma imagem')
  const originalPrice = b.originalPrice ? money(b.originalPrice, price, 1_000_000) : undefined
  if (originalPrice === null) return badRequest('O preço original deve ser maior que o preço')

  // Sizes and colors, each with its own stock and an optional price difference
  const variants: ProductInput['variants'] = []
  for (const v of Array.isArray(b.variants) ? b.variants.slice(0, 20) : []) {
    const type = v?.type === 'size' || v?.type === 'color' ? v.type : null
    const vName = str(v?.name, 30)
    const vStock = int(v?.stock, 0, 100_000)
    const priceModifier = v?.priceModifier ? signedMoney(v.priceModifier, 0.01 - price, 1_000_000) : 0
    const value = type === 'color' ? str(v?.value, 7) : vName
    const id = typeof v?.id === 'string' && v.id ? v.id : undefined
    if (!type || !vName || vStock === null) return badRequest(`Variação inválida${vName ? `: ${vName}` : ''}`)
    if (priceModifier === null) return badRequest(`Diferença de preço inválida: ${vName}`)
    if (type === 'color' && !/^#[0-9a-f]{6}$/i.test(value ?? '')) return badRequest(`Cor inválida: ${vName}`)
    if (variants.some(x => x.type === type && x.name.toLowerCase() === vName.toLowerCase())) {
      return badRequest(`Variação repetida: ${vName}`)
    }
    variants.push({ id, type, name: vName, value: value!, stock: vStock, priceModifier })
  }

  // Package for shipping quotes: each value optional (Correios limits: 30 kg, 100 cm a side)
  const pkg = (b.package ?? {}) as Record<string, unknown>
  const optional = (v: unknown, min: number, max: number) => (v === undefined || v === null || v === '' ? null : int(v, min, max))
  const packageSize = {
    weightG: optional(pkg.weightG, 1, 30_000),
    heightCm: optional(pkg.heightCm, 1, 100),
    widthCm: optional(pkg.widthCm, 1, 100),
    lengthCm: optional(pkg.lengthCm, 1, 100),
  }
  for (const [key, raw] of Object.entries(pkg)) {
    if (raw !== '' && raw !== undefined && raw !== null && packageSize[key as keyof typeof packageSize] === null) {
      return badRequest(
        key === 'weightG'
          ? 'Peso inválido: use gramas, de 1 a 30.000'
          : 'Medida da embalagem inválida: use centímetros, de 1 a 100 por lado'
      )
    }
  }

  return {
    name,
    description: str(b.description, 2000) ?? '',
    price,
    originalPrice,
    stock,
    category,
    images,
    tags: strList(b.tags, 10, 30),
    variants,
    package: packageSize,
  }
}

// A variant's price difference can be negative ("-10,00" for a cheaper option)
function signedMoney(v: unknown, min: number, max: number) {
  if (typeof v === 'number') return Number.isFinite(v) && v >= min && v <= max ? Math.round(v * 100) / 100 : null
  const text = typeof v === 'string' ? v.trim().replace(/^\+/, '') : v
  const negative = typeof text === 'string' && text.startsWith('-')
  const n = money(negative ? (text as string).slice(1) : text, 0, Math.max(max, -min))
  if (n === null) return null
  const signed = negative ? -n : n
  return signed >= min && signed <= max ? signed : null
}
