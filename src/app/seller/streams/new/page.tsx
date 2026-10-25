import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getCategories, getUser, getSellerDashboard } from '@/lib/db'
import { StreamForm } from './StreamForm'

export const dynamic = 'force-dynamic'

export default async function NewStreamPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const profile = await getUser(session.user.id)
  if (!profile?.isSeller) redirect('/seller/dashboard')

  const [categories, { products }] = await Promise.all([getCategories(), getSellerDashboard(session.user.id)])
  return <StreamForm categories={categories} products={products.map(p => ({ id: p.id, name: p.name }))} />
}
