import { handleChargeEvent } from '@/lib/payments'
import { webhookTokenMatches } from '@/lib/payments/asaas'

// Asaas calls this when a charge changes (paid, expired, refunded…).
// Set it up in Asaas → Integrações → Webhooks with the same token as ASAAS_WEBHOOK_TOKEN.
export async function POST(request: Request) {
  if (!webhookTokenMatches(request.headers.get('asaas-access-token'))) return new Response('Unauthorized', { status: 401 })
  const body = (await request.json().catch(() => null)) as { event?: unknown; payment?: { id?: unknown } } | null
  const event = typeof body?.event === 'string' ? body.event : null
  const chargeId = typeof body?.payment?.id === 'string' ? body.payment.id : null
  // Other events (transfers, accounts…) are acknowledged so Asaas doesn't retry them
  if (event && chargeId) await handleChargeEvent(event, chargeId)
  return Response.json({ received: true })
}
