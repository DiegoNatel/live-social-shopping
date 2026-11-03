import { getSession } from '@/lib/auth'
import { isAdmin } from '@/lib/moderation'

// Whether to show the link to /admin
export async function GET() {
  const session = await getSession()
  return Response.json({ admin: !!session && (await isAdmin(session.user.id)) })
}
