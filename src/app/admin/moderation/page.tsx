import { notFound, redirect } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { getSession } from '@/lib/auth'
import { getBannedUsers, getOpenReports, getOrdersNeedingAction, isAdmin } from '@/lib/moderation'
import { AdminTabs } from '../AdminTabs'
import { AdminView } from '../AdminView'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false } }

export default async function ModerationPage() {
  const session = await getSession()
  if (!session) redirect('/login?next=/admin/moderation')
  if (!(await isAdmin(session.user.id))) notFound()
  const [reports, orders, banned] = await Promise.all([getOpenReports(), getOrdersNeedingAction(), getBannedUsers()])
  return (
    <MainLayout headerProps={{ title: 'Painel da Watchhaul' }}>
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <AdminTabs active="/admin/moderation" />
      </div>
      <AdminView reports={reports} orders={orders} banned={banned} />
    </MainLayout>
  )
}
