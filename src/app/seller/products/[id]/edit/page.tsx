import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getCategories, getUser } from '@/lib/db'
import { getSellerProduct } from '@/lib/seller'
import { ProductForm } from '../../new/ProductForm'

export const dynamic = 'force-dynamic'

// Edit every field of one of the seller's own products (paused ones too)
export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) redirect(`/login?next=/seller/products/${encodeURIComponent(id)}/edit`)
  const profile = await getUser(session.user.id)
  if (!profile?.isSeller) redirect('/seller/dashboard')
  const product = await getSellerProduct(session.user.id, id)
  if (!product || product.isBlocked) notFound()
  return <ProductForm categories={await getCategories()} product={product} />
}
