import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getCategories, getDb, getUser, getSellerDashboard } from '@/lib/db'
import { getGuestInvites } from '@/lib/guests'
import { DashboardView } from './DashboardView'
import { SellerStart } from './SellerStart'
import { paymentsEnabled } from '@/lib/payments'

export const dynamic = 'force-dynamic'

export default async function SellerDashboardPage({ searchParams }: { searchParams: Promise<{ skip?: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login?next=/seller/dashboard')

  const profile = await getUser(session.user.id)
  if (!profile) redirect('/login')
  const start = async (shipFromZip: string | null) => (
    <SellerStart categories={await getCategories()} sellerName={profile.user.name} isSeller={profile.isSeller} shipFromZip={shipFromZip} />
  )
  if (!profile.isSeller) return start(null)

  const [data, invites, account] = await Promise.all([
    getSellerDashboard(session.user.id),
    getGuestInvites(session.user.id),
    getDb()
      .prepare('SELECT asaas_wallet_id, ship_from_zip FROM users WHERE id = ?')
      .bind(session.user.id)
      .first<{ asaas_wallet_id: string | null; ship_from_zip: string | null }>(),
  ])
  // New sellers start by publishing their first product, unless they chose to skip it
  if (data.products.length === 0 && !(await searchParams).skip) return start(account?.ship_from_zip ?? null)

  const walletId = account?.asaas_wallet_id
  // Sellers only need a wallet once payments are on
  const payout = paymentsEnabled() ? { walletId: walletId ?? null } : null
  return <DashboardView seller={profile.user} {...data} invites={invites} payout={payout} shipFromZip={account?.ship_from_zip ?? null} />
}
