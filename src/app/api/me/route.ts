import { getSession } from '@/lib/auth'
import { getUser, getFollowedHostIds, getDb } from '@/lib/db'
import { getFavoriteIds } from '@/lib/engagement'

// Current user's profile for the client store; { user: null } when signed out
export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ user: null })

  const [profile, followedHosts, favoriteIds, reminders] = await Promise.all([
    getUser(session.user.id),
    getFollowedHostIds(session.user.id),
    getFavoriteIds(session.user.id),
    // Only lives that haven't started: the others have nothing left to remind
    getDb()
      .prepare(
        `SELECT r.stream_id FROM stream_reminders r JOIN streams s ON s.id = r.stream_id
         WHERE r.user_id = ? AND s.status = 'scheduled'`
      )
      .bind(session.user.id)
      .all<{ stream_id: string }>()
      .then(r => r.results.map(x => x.stream_id)),
  ])
  if (!profile) return Response.json({ user: null })

  return Response.json({
    user: profile.user,
    interests: profile.interests,
    isSeller: profile.isSeller,
    followedHosts,
    favoriteIds,
    reminderStreamIds: reminders,
  })
}
