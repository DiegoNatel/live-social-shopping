import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getCategories, getUser } from '@/lib/db'
import { ProductForm } from './ProductForm'

export const dynamic = 'force-dynamic'

export default async function NewProductPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const profile = await getUser(session.user.id)
  if (!profile?.isSeller) redirect('/seller/dashboard')
  return <ProductForm categories={(await getCategories()).filter(c => c.slug !== 'courses')} />
}
