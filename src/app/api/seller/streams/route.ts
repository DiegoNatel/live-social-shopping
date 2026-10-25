import { requireSeller, createStream } from '@/lib/seller'
import { str, strList, imageUrls, isoDate, badRequest, readJson } from '@/lib/validate'

export async function POST(request: Request) {
  const sellerId = await requireSeller()
  if (sellerId instanceof Response) return sellerId

  const b = await readJson(request)
  if (!b) return badRequest('Dados inválidos')
  const title = str(b.title, 120)
  const category = str(b.category, 40)
  const scheduledAt = isoDate(b.scheduledAt)
  if (!title || !category || !scheduledAt) return badRequest('Preencha título, categoria e data')
  if (new Date(scheduledAt).getTime() < Date.now() - 60_000) return badRequest('A data deve ser no futuro')

  const id = await createStream(sellerId, {
    title,
    description: str(b.description, 2000) ?? '',
    category,
    scheduledAt,
    thumbnail: imageUrls([b.thumbnail], 1)[0],
    productIds: strList(b.productIds, 20, 64),
    tags: strList(b.tags, 10, 30),
  })
  return Response.json({ id }, { status: 201 })
}
