import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PartyPopper } from 'lucide-react'
import { MainLayout } from '@/components/layout/MainLayout'
import { BackLink } from '@/components/ui/BackLink'
import { Spotlight } from '@/components/ui/Spotlight'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { paymentsEnabled } from '@/lib/payments'
import { PayoutPanel } from '../dashboard/PayoutPanel'
import { ShipFromPanel } from '../dashboard/ShippingPanels'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Recebimento e envio' }

// The seller's set-up: where their money goes (Asaas wallet) and where packages leave from (CEP).
// Buyers can only buy from them once both are set. ?focus=wallet|zip (from the dashboard
// checklist, reminders and e-mails) scrolls to that field and highlights it.
export default async function SellerSettingsPage({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login?next=/seller/settings')
  const account = await getDb()
    .prepare('SELECT is_seller, asaas_wallet_id, ship_from_zip FROM users WHERE id = ?')
    .bind(session.user.id)
    .first<{ is_seller: number; asaas_wallet_id: string | null; ship_from_zip: string | null }>()
  if (!account?.is_seller) redirect('/seller/dashboard')

  const payments = paymentsEnabled()
  const needsWallet = payments && !account.asaas_wallet_id
  const needsZip = !account.ship_from_zip
  const { focus } = await searchParams

  return (
    <MainLayout headerProps={{ title: 'Recebimento e envio', showSearch: false, showCart: false }}>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <BackLink fallback="/seller/dashboard" />
        <h1 className="text-gray-900 text-2xl font-semibold mt-3">Recebimento e envio</h1>
        {needsWallet || needsZip ? (
          <p className="text-gray-500 mt-1 mb-4">
            Seus compradores só conseguem comprar depois que estes dados estiverem preenchidos.
          </p>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-md bg-tropical-green/10 text-gray-900 px-4 py-3 mt-3 mb-4">
            <span className="inline-flex items-center gap-2 font-medium">
              <PartyPopper className="w-5 h-5 text-tropical-green shrink-0" />
              Tudo pronto: sua loja já pode vender.
            </span>
            <Link href="/seller/dashboard" className="text-sm font-semibold hover:underline shrink-0">
              Ir para o painel
            </Link>
          </div>
        )}

        {payments ? (
          <Spotlight active={focus === 'wallet' && needsWallet} tip="Cole aqui o Wallet ID da sua conta Asaas">
            <PayoutPanel walletId={account.asaas_wallet_id} />
          </Spotlight>
        ) : (
          <p className="text-gray-500 text-sm mb-6">Os pagamentos online ainda não estão ativos.</p>
        )}
        <Spotlight active={focus === 'zip' && needsZip} tip="Digite o CEP de onde saem seus pacotes">
          <ShipFromPanel zip={account.ship_from_zip} />
        </Spotlight>
      </div>
    </MainLayout>
  )
}
