import { notFound, redirect } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { getSession } from '@/lib/auth'
import { getBannedUsers, getOpenReports, getOrdersNeedingAction, isAdmin } from '@/lib/moderation'
import { AdminView } from './AdminView'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false } }

export default async function AdminPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  // Not found rather than forbidden: nobody else needs to know this page exists
  if (!(await isAdmin(session.user.id))) notFound()
  const [reports, orders, banned] = await Promise.all([getOpenReports(), getOrdersNeedingAction(), getBannedUsers()])
  return (
    <MainLayout headerProps={{ title: 'Moderação' }}>
      <AdminView reports={reports} orders={orders} banned={banned} />
    </MainLayout>
  )
}
