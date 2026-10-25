import { getSession } from '@/lib/auth'
import { cancelOrder } from '@/lib/orders'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  const ok = await cancelOrder(session.user.id, (await params).id)
  return ok
    ? new Response(null, { status: 204 })
    : Response.json({ message: 'Só pedidos aguardando pagamento podem ser cancelados' }, { status: 409 })
}
