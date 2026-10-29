import { getSession } from '@/lib/auth'
import { chargeOrder, normalizeCpf, PaymentError } from '@/lib/payments'

// The order's payment: Pix QR code or the card/boleto page, created on first request.
// The checkout polls ?status to see when it's paid.
// POST { taxId } creates it with the buyer's CPF when it isn't saved yet.
async function payment(request: Request, id: string, taxId?: string | null) {
  const statusOnly = new URL(request.url).searchParams.has('status')
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  try {
    return Response.json(await chargeOrder(session.user.id, id, { taxId, statusOnly }), { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    if (e instanceof PaymentError) {
      const status = e.code === 'NOT_FOUND' ? 404 : e.code === 'TAX_ID' ? 400 : 503
      return Response.json({ error: e.code, message: e.message }, { status })
    }
    throw e
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return payment(request, (await params).id)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = (await request.json().catch(() => null)) as { taxId?: unknown } | null
  const taxId = normalizeCpf(body?.taxId)
  if (!taxId) return Response.json({ error: 'TAX_ID', message: 'CPF inválido' }, { status: 400 })
  return payment(request, (await params).id, taxId)
}
