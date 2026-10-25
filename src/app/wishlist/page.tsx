import { redirect } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProductGrid } from '@/components/product/ProductGrid'
import { EmptyState } from '@/components/ui/EmptyState'
import { getSession } from '@/lib/auth'
import { getFavoriteProducts } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function WishlistPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const products = await getFavoriteProducts(session.user.id)

  return (
    <MainLayout headerProps={{ title: 'Lista de desejos' }}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {products.length ? (
          <ProductGrid products={products} />
        ) : (
          <EmptyState
            title="Sua lista está vazia"
            text="Toque no coração de um produto para guardá-lo aqui."
            href="/discover"
            linkLabel="Explorar produtos"
          />
        )}
      </div>
    </MainLayout>
  )
}
