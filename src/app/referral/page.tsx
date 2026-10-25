import { redirect } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { getSession } from '@/lib/auth'
import { InviteLink } from './InviteLink'

export const dynamic = 'force-dynamic'

export default async function ReferralPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const username = (session.user as { username?: string | null }).username ?? ''

  return (
    <MainLayout headerProps={{ title: 'Convide amigos' }}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-md shadow-card p-6 space-y-4">
          <div>
            <h2 className="text-gray-900 font-semibold text-lg">Chame seus amigos para as lives</h2>
            <p className="text-gray-500 text-sm mt-1">
              Compartilhe seu link. Quem entrar por ele cai direto na página de cadastro do VivoBuy.
            </p>
          </div>
          <InviteLink username={username} />
        </div>
      </div>
    </MainLayout>
  )
}
