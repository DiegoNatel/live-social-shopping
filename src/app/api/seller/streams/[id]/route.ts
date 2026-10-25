import { requireSeller, setStreamStatus } from '@/lib/seller'
import { badRequest, readJson } from '@/lib/validate'

// { status: 'live' } starts the stream (notifies followers); { status: 'ended' } finishes it
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sellerId = await requireSeller()
  if (sellerId instanceof Response) return sellerId
  const { id } = await params

  const b = await readJson(request)
  const status = b?.status === 'live' || b?.status === 'ended' ? b.status : null
  if (!status) return badRequest('Status inválido')

  const ok = await setStreamStatus(sellerId, id, status)
  return ok ? new Response(null, { status: 204 }) : new Response('Not found', { status: 404 })
}
