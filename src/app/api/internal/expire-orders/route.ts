import { getCloudflareContext } from '@opennextjs/cloudflare'
import { expireUnpaidOrders } from '@/lib/payments'

// Called by the cron in worker.ts every 5 minutes, with the auth secret as a key
export async function POST(request: Request) {
  const secret = getCloudflareContext().env.BETTER_AUTH_SECRET
  if (!secret || request.headers.get('x-cron-key') !== secret) return new Response('Unauthorized', { status: 401 })
  return Response.json({ cancelled: await expireUnpaidOrders() })
}
