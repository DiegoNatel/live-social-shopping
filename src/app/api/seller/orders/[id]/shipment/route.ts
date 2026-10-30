import { requireSeller } from '@/lib/seller'
import { markShipped } from '@/lib/shipping'

// The seller shipped their part of a paid order: { trackingCode }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sellerId = await requireSeller()
  if (sellerId instanceof Response) return sellerId
  const body = (await request.json().catch(() => null)) as { trackingCode?: unknown } | null
  const code = typeof body?.trackingCode === 'string' ? body.trackingCode.trim().toUpperCase() : ''
  if (!/^[A-Z0-9-]{6,40}$/.test(code)) return Response.json({ message: 'Código de rastreio inválido' }, { status: 400 })
  const result = await markShipped(sellerId, (await params).id, code)
  if (result === 'not_paid') return Response.json({ message: 'Só pedidos pagos podem ser enviados' }, { status: 409 })
  if (result === 'refunding') return Response.json({ message: 'Este pedido está em reembolso ou contestação. Não envie.' }, { status: 409 })
  if (result === 'not_found') return Response.json({ message: 'Pedido não encontrado' }, { status: 404 })
  return new Response(null, { status: 204 })
}
