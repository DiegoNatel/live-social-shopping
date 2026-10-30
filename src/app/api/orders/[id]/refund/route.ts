import { getSession } from '@/lib/auth'
import { requestRefund } from '@/lib/refunds'

// The buyer gives up a paid order
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  const result = await requestRefund(session.user.id, (await params).id)
  if (result === 'not_refundable') return Response.json({ message: 'Este pedido não pode mais ser reembolsado por aqui' }, { status: 409 })
  return new Response(null, { status: 204 })
}
