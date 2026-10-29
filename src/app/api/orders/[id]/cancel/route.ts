import { getSession } from '@/lib/auth'
import { cancelUnpaidOrder } from '@/lib/payments'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  const result = await cancelUnpaidOrder(session.user.id, (await params).id)
  if (result === 'cancelled') return new Response(null, { status: 204 })
  const message = result === 'paid' ? 'Este pedido já foi pago' : 'Só pedidos aguardando pagamento podem ser cancelados'
  return Response.json({ message }, { status: 409 })
}
