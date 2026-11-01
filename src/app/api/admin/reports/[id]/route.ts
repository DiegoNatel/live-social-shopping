import { requireAdmin, resolveReport } from '@/lib/moderation'

// An admin decides a report: { action: 'dismiss' | 'remove' | 'ban' }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await requireAdmin()
  if (adminId instanceof Response) return adminId
  const body = (await request.json().catch(() => null)) as { action?: unknown } | null
  const action = body?.action
  if (action !== 'dismiss' && action !== 'remove' && action !== 'ban') return new Response('Bad request', { status: 400 })
  const result = await resolveReport(adminId, (await params).id, action)
  if (result === 'not_found') return Response.json({ message: 'Esta denúncia já foi resolvida' }, { status: 409 })
  if (result === 'is_admin') return Response.json({ message: 'Administradores não podem ser banidos' }, { status: 409 })
  return new Response(null, { status: 204 })
}
