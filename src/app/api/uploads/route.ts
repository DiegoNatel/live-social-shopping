import { requireSeller } from '@/lib/seller'
import { saveImage, MAX_IMAGE_BYTES } from '@/lib/uploads'
import { badRequest } from '@/lib/validate'

// Image upload for product photos and stream thumbnails: multipart field "file"
export async function POST(request: Request) {
  const sellerId = await requireSeller()
  if (sellerId instanceof Response) return sellerId

  if (Number(request.headers.get('content-length') ?? 0) > MAX_IMAGE_BYTES + 64 * 1024) {
    return badRequest('A imagem deve ter no máximo 5 MB')
  }
  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return badRequest('Envie um arquivo de imagem')
  if (file.size > MAX_IMAGE_BYTES) return badRequest('A imagem deve ter no máximo 5 MB')

  const url = await saveImage(sellerId, await file.arrayBuffer())
  if (!url) return badRequest('Use uma imagem JPG, PNG, WebP ou GIF')
  return Response.json({ url }, { status: 201 })
}
