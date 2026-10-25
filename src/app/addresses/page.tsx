import { redirect } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { getSession } from '@/lib/auth'
import { listAddresses } from '@/lib/addresses'
import { AddressBook } from './AddressBook'

export const dynamic = 'force-dynamic'

export default async function AddressesPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const addresses = await listAddresses(session.user.id)

  return (
    <MainLayout headerProps={{ title: 'Endereços' }}>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <AddressBook initial={addresses} defaultName={session.user.name} />
      </div>
    </MainLayout>
  )
}
