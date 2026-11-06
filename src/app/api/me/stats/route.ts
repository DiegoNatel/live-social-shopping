import { getSession } from '@/lib/auth'
import { getPurchaseStats, getSellerProfileStats } from '@/lib/db'

// The profile's numbers: purchases, or with ?as=seller the seller's product count
export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  if (new URL(request.url).searchParams.get('as') === 'seller') {
    return Response.json(await getSellerProfileStats(session.user.id))
  }
  return Response.json(await getPurchaseStats(session.user.id))
}
