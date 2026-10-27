import { requireSeller } from '@/lib/seller'
import { addStreamProducts, removeStreamProduct } from '@/lib/guests'
import { broadcast } from '@/lib/live'
import { str, strList, badRequest, readJson } from '@/lib/validate'

// { productIds } adds the seller's own products to the live (host or accepted guest)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sellerId = await requireSeller()
  if (sellerId instanceof Response) return sellerId
  const { id } = await params
  const productIds = strList((await readJson(request))?.productIds, 20, 64)
  if (productIds.length === 0) return badRequest('Escolha ao menos um produto')
  if (!(await addStreamProducts(sellerId, id, productIds))) {
    return Response.json({ message: 'Você só pode adicionar produtos nas suas lives ou nas que aceitou convite' }, { status: 403 })
  }
  broadcast(id, { t: 'products' })
  return new Response(null, { status: 204 })
}

// { productId } takes a product off the live (its seller, or the host)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sellerId = await requireSeller()
  if (sellerId instanceof Response) return sellerId
  const { id } = await params
  const productId = str((await readJson(request))?.productId, 64)
  if (!productId) return badRequest('Produto inválido')
  if (!(await removeStreamProduct(sellerId, id, productId))) return new Response('Not found', { status: 404 })
  broadcast(id, { t: 'products' })
  return new Response(null, { status: 204 })
}
