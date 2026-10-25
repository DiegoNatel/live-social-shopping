import { MainLayout } from '@/components/layout/MainLayout'
import { ProductGrid } from '@/components/product/ProductGrid'
import { EmptyState } from '@/components/ui/EmptyState'
import { getProducts } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function TrendingPage() {
  const products = await getProducts({ sort: 'trending', inStock: true, limit: 40 })
  return (
    <MainLayout headerProps={{ title: 'Em alta' }}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <p className="text-gray-500 text-sm mb-4">Os mais vendidos nos últimos 30 dias.</p>
        {products.length ? (
          <ProductGrid products={products} />
        ) : (
          <EmptyState title="Nada por aqui ainda" href="/discover" linkLabel="Explorar produtos" />
        )}
      </div>
    </MainLayout>
  )
}
