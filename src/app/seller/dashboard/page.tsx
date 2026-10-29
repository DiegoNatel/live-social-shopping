import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getDb, getUser, getSellerDashboard } from '@/lib/db'
import { getGuestInvites } from '@/lib/guests'
import { DashboardView } from './DashboardView'
import { BecomeSeller } from './BecomeSeller'
import { paymentsEnabled } from '@/lib/payments'

export const dynamic = 'force-dynamic'

export default async function SellerDashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const profile = await getUser(session.user.id)
  if (!profile) redirect('/login')
  if (!profile.isSeller) return <BecomeSeller />

  const [data, invites, walletId] = await Promise.all([
    getSellerDashboard(session.user.id),
    getGuestInvites(session.user.id),
    getDb().prepare('SELECT asaas_wallet_id FROM users WHERE id = ?').bind(session.user.id).first<string | null>('asaas_wallet_id'),
  ])
  // Sellers only need a wallet once payments are on
  const payout = paymentsEnabled() ? { walletId: walletId ?? null } : null
  return <DashboardView seller={profile.user} {...data} invites={invites} payout={payout} />
}
