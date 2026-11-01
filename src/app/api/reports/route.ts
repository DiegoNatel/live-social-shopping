import { getSession } from '@/lib/auth'
import { createReport } from '@/lib/moderation'
import { REPORT_REASONS, type ReportReason, type ReportTarget } from '@/lib/report-reasons'

const TARGETS: ReportTarget[] = ['product', 'stream', 'message']

// A signed-in user reports a product, live or chat message: { type, id, reason, details? }
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  const body = (await request.json().catch(() => null)) as { type?: unknown; id?: unknown; reason?: unknown; details?: unknown } | null
  if (
    !TARGETS.includes(body?.type as ReportTarget) ||
    typeof body?.id !== 'string' ||
    typeof body.reason !== 'string' ||
    !Object.hasOwn(REPORT_REASONS, body.reason)
  ) {
    return Response.json({ message: 'Denúncia inválida' }, { status: 400 })
  }
  const details = typeof body.details === 'string' ? body.details.trim().slice(0, 500) || null : null
  const result = await createReport(session.user.id, {
    type: body.type as ReportTarget,
    id: body.id,
    reason: body.reason as ReportReason,
    details,
  })
  if (result === 'not_found') return Response.json({ message: 'Este conteúdo não existe mais' }, { status: 404 })
  if (result === 'too_many') return Response.json({ message: 'Você enviou muitas denúncias hoje. Tente amanhã.' }, { status: 429 })
  return new Response(null, { status: 204 })
}
