import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getCategories, getDb, getUser, getSellerDashboard } from '@/lib/db'
import { getGuestInvites } from '@/lib/guests'
import { DashboardView, type DashboardTab } from './DashboardView'
import { SellerStart } from './SellerStart'
import { paymentsEnabled } from '@/lib/payments'

export const dynamic = 'force-dynamic'

const TABS: DashboardTab[] = ['overview', 'products', 'streams', 'auctions', 'analytics']

export default async function SellerDashboardPage({ searchParams }: { searchParams: Promise<{ skip?: string; tab?: string; published?: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login?next=/seller/dashboard')

  const profile = await getUser(session.user.id)
  if (!profile) redirect('/login?next=/seller/dashboard')
  const start = async (shipFromZip: string | null, walletId: string | null) => (
    <SellerStart
      categories={await getCategories()}
      sellerName={profile.user.name}
      isSeller={profile.isSeller}
      shipFromZip={shipFromZip}
      needsWallet={paymentsEnabled() && !walletId}
    />
  )
  if (!profile.isSeller) return start(null, null)

  const [data, invites, account] = await Promise.all([
    getSellerDashboard(session.user.id),
    getGuestInvites(session.user.id),
    getDb()
      .prepare('SELECT asaas_wallet_id, ship_from_zip FROM users WHERE id = ?')
      .bind(session.user.id)
      .first<{ asaas_wallet_id: string | null; ship_from_zip: string | null }>(),
  ])
  // New sellers start by publishing their first product, unless they chose to skip it
  if (data.products.length === 0 && !(await searchParams).skip) return start(account?.ship_from_zip ?? null, account?.asaas_wallet_id ?? null)

  const walletId = account?.asaas_wallet_id
  // Sellers only need a wallet once payments are on
  const payout = paymentsEnabled() ? { walletId: walletId ?? null } : null
  const { tab, published } = await searchParams
  const initialTab = TABS.find(t => t === tab) ?? 'overview'
  return (
    <DashboardView
      seller={profile.user}
      {...data}
      invites={invites}
      payout={payout}
      shipFromZip={account?.ship_from_zip ?? null}
      initialTab={initialTab}
      justPublished={published === '1'}
    />
  )
}

export const metadata: Metadata = { title: 'Painel do vendedor' }
