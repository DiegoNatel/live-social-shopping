import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getUser, getSellerDashboard } from '@/lib/db'
import { getGuestInvites } from '@/lib/guests'
import { DashboardView } from './DashboardView'
import { BecomeSeller } from './BecomeSeller'

export const dynamic = 'force-dynamic'

export default async function SellerDashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const profile = await getUser(session.user.id)
  if (!profile) redirect('/login')
  if (!profile.isSeller) return <BecomeSeller />

  const [data, invites] = await Promise.all([getSellerDashboard(session.user.id), getGuestInvites(session.user.id)])
  return <DashboardView seller={profile.user} {...data} invites={invites} />
}
