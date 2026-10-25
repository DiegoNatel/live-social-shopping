import { MainLayout } from '@/components/layout/MainLayout'
import { ProductGrid } from '@/components/product/ProductGrid'
import { EmptyState } from '@/components/ui/EmptyState'
import { getProducts } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function DealsPage() {
  const products = await getProducts({ onSale: true, inStock: true, sort: 'discount', limit: 60 })
  return (
    <MainLayout headerProps={{ title: 'Ofertas' }}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <p className="text-gray-500 text-sm mb-4">Os maiores descontos primeiro.</p>
        {products.length ? (
          <ProductGrid products={products} />
        ) : (
          <EmptyState title="Nenhuma oferta no momento" href="/discover" linkLabel="Explorar produtos" />
        )}
      </div>
    </MainLayout>
  )
}
