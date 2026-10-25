import { getSession } from '@/lib/auth'
import { getDefaultAddress } from '@/lib/orders'

// Saved delivery address used to prefill checkout
export async function GET() {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  return Response.json(await getDefaultAddress(session.user.id))
}
