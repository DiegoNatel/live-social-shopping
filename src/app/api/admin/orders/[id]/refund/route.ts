import { requireAdmin } from '@/lib/moderation'
import { refundOrder } from '@/lib/refunds'

// An admin refunds an order: a seller who never confirmed the return, a banned seller's
// unshipped order, or a refund to try again now
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await requireAdmin()
  if (adminId instanceof Response) return adminId
  await refundOrder((await params).id)
  return new Response(null, { status: 204 })
}
