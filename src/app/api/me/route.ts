import { getSession } from '@/lib/auth'
import { getUser, getFollowedHostIds } from '@/lib/db'

// Current user's profile for the client store; { user: null } when signed out
export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ user: null })

  const [profile, followedHosts] = await Promise.all([
    getUser(session.user.id),
    getFollowedHostIds(session.user.id),
  ])
  if (!profile) return Response.json({ user: null })

  return Response.json({ user: profile.user, interests: profile.interests, isSeller: profile.isSeller, followedHosts })
}
