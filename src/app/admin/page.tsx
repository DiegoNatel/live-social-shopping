import { notFound, redirect } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { getSession } from '@/lib/auth'
import { getFoundersDashboard } from '@/lib/founders'
import { isAdmin } from '@/lib/moderation'
import { AdminTabs } from './AdminTabs'
import { FoundersView } from './FoundersView'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false } }

export default async function AdminPage() {
  const session = await getSession()
  if (!session) redirect('/login?next=/admin')
  // Not found rather than forbidden: nobody else needs to know this page exists
  if (!(await isAdmin(session.user.id))) notFound()
  const dashboard = await getFoundersDashboard()
  return (
    <MainLayout headerProps={{ title: 'Painel da Watchhaul' }}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <AdminTabs active="/admin" />
        <FoundersView {...dashboard} />
      </div>
    </MainLayout>
  )
}
