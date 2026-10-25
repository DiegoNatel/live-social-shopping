import Link from 'next/link'
import { Search } from 'lucide-react'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProductGrid } from '@/components/product/ProductGrid'
import { StreamCard } from '@/components/stream/StreamCard'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { search } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? '').trim().slice(0, 80)
  const results = q.length >= 2 ? await search(q) : null
  const total = results ? results.products.length + results.streams.length + results.sellers.length : 0

  return (
    <MainLayout headerProps={{ title: 'Buscar' }}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Plain GET form: works without JavaScript and keeps the query in the URL */}
        <form action="/search" className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Produtos, lives ou vendedores"
            autoFocus
            className="w-full h-12 pl-10 pr-4 rounded-md bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400 outline-none focus:border-sky-blue"
          />
        </form>

        {q.length > 0 && q.length < 2 && <p className="text-gray-500 text-sm">Digite pelo menos 2 letras.</p>}
        {results && total === 0 && (
          <EmptyState title={`Nada encontrado para “${q}”`} text="Tente outra palavra." href="/discover" linkLabel="Explorar" />
        )}

        {results && results.sellers.length > 0 && (
          <section className="mb-8">
            <h2 className="text-gray-900 font-semibold mb-3">Vendedores</h2>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {results.sellers.map(seller => (
                <div key={seller.id} className="flex-shrink-0 w-24 text-center">
                  <Avatar src={seller.avatar} alt={seller.name} size="lg" isVerified={seller.isVerified} className="mx-auto" />
                  <p className="text-gray-900 text-sm mt-1 truncate">{seller.name}</p>
                  <p className="text-gray-400 text-xs truncate">@{seller.username}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {results && results.streams.length > 0 && (
          <section className="mb-8">
            <h2 className="text-gray-900 font-semibold mb-3">Lives</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {results.streams.map((stream, index) => (
                <StreamCard key={stream.id} stream={stream} variant="horizontal" index={index} />
              ))}
            </div>
          </section>
        )}

        {results && results.products.length > 0 && (
          <section>
            <h2 className="text-gray-900 font-semibold mb-3">Produtos</h2>
            <ProductGrid products={results.products} />
          </section>
        )}

        {!q && (
          <p className="text-gray-500 text-sm">
            Ou veja as <Link href="/deals" className="text-sky-blue hover:underline">ofertas</Link> e o que está{' '}
            <Link href="/trending" className="text-sky-blue hover:underline">em alta</Link>.
          </p>
        )}
      </div>
    </MainLayout>
  )
}
