import { requireSeller } from '@/lib/seller'
import { pinProduct } from '@/lib/host-tools'
import { broadcast } from '@/lib/live'
import { str, readJson } from '@/lib/validate'

// { productId } pins a product for viewers; { productId: null } unpins
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sellerId = await requireSeller()
  if (sellerId instanceof Response) return sellerId
  const { id } = await params
  const productId = str((await readJson(request))?.productId, 64)
  if (!(await pinProduct(sellerId, id, productId))) return new Response('Not found', { status: 404 })
  broadcast(id, { t: 'pin', productId })
  return new Response(null, { status: 204 })
}
