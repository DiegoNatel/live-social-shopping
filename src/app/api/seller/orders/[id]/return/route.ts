import { requireSeller } from '@/lib/seller'
import { confirmReturn } from '@/lib/refunds'

// The seller got a returned product back, which releases the buyer's refund
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sellerId = await requireSeller()
  if (sellerId instanceof Response) return sellerId
  if (!(await confirmReturn(sellerId, (await params).id))) {
    return Response.json({ message: 'Não há devolução aberta para este pedido' }, { status: 409 })
  }
  return new Response(null, { status: 204 })
}
