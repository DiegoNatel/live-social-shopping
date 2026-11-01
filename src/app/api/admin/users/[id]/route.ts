import { requireAdmin, unbanUser } from '@/lib/moderation'

// An admin lifts a ban
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await requireAdmin()
  if (adminId instanceof Response) return adminId
  await unbanUser((await params).id)
  return new Response(null, { status: 204 })
}
