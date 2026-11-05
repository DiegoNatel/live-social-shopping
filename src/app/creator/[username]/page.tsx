import type { Metadata } from 'next'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProductGrid } from '@/components/product/ProductGrid'
import { ProductModal } from '@/components/product/ProductModal'
import { StreamCard } from '@/components/stream/StreamCard'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { getCreatorPage } from '@/lib/db'
import { formatNumber } from '@/lib/utils'
import { CreatorActions } from './CreatorActions'

export const dynamic = 'force-dynamic'

const load = cache((username: string) => getCreatorPage(decodeURIComponent(username)))

// A shared creator link shows their name, bio and photo
export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const data = await load((await params).username)
  if (!data) return { title: 'Perfil não encontrado' }
  const { creator, products } = data
  const description =
    creator.bio || `Lives e ${products.length} ${products.length === 1 ? 'produto' : 'produtos'} de ${creator.name}.`
  const images = creator.avatar ? [creator.avatar] : undefined
  return {
    title: creator.name,
    description,
    openGraph: { type: 'profile', title: creator.name, description, images },
    twitter: { card: 'summary', title: creator.name, description, images },
  }
}

const plural = (n: number, one: string, many: string) => `${formatNumber(n)} ${n === 1 ? one : many}`

export default async function CreatorPage({ params }: { params: Promise<{ username: string }> }) {
  const data = await load((await params).username)
  if (!data) notFound()
  const { creator, products, live, upcoming, recordings } = data
  const isLive = live.length > 0

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Profile header */}
        <section className="bg-white rounded-md shadow-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar src={creator.avatar} alt={creator.name} size="xl" isVerified={creator.isVerified} isLive={isLive} />
          <div className="flex-1 min-w-0">
            <h1 className="text-gray-900 text-xl font-semibold">{creator.name}</h1>
            <p className="text-gray-400 text-sm">@{creator.username}</p>
            {creator.bio && <p className="text-gray-600 text-sm mt-2 whitespace-pre-line">{creator.bio}</p>}
            <p className="text-gray-500 text-sm mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <span>
                <strong className="text-gray-900 font-semibold">{formatNumber(creator.followers)}</strong>{' '}
                {creator.followers === 1 ? 'seguidor' : 'seguidores'}
              </span>
              <span>{plural(products.length, 'produto', 'produtos')}</span>
              {recordings.length > 0 && <span>{plural(recordings.length, 'gravação', 'gravações')}</span>}
            </p>
          </div>
          <CreatorActions creatorId={creator.id} name={creator.name} />
        </section>

        {live.length > 0 && (
          <section className="mt-8">
            <h2 className="text-gray-900 font-semibold text-lg mb-3 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-coral-pink opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-coral-pink" />
              </span>
              Ao vivo agora
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {live.map((stream, index) => (
                <StreamCard key={stream.id} stream={stream} index={index} variant="creator-first" />
              ))}
            </div>
          </section>
        )}

        {upcoming.length > 0 && (
          <section className="mt-8">
            <h2 className="text-gray-900 font-semibold text-lg mb-3">Próximas lives</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {upcoming.map((stream, index) => (
                <StreamCard key={stream.id} stream={stream} variant="horizontal" index={index} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="text-gray-900 font-semibold text-lg mb-3">Produtos</h2>
          {products.length > 0 ? (
            <ProductGrid products={products} />
          ) : (
            <EmptyState title="Nenhum produto à venda no momento" text="Siga para saber quando houver novidades." />
          )}
        </section>

        {recordings.length > 0 && (
          <section className="mt-8 mb-10">
            <h2 className="text-gray-900 font-semibold text-lg mb-3">Gravações</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {recordings.map((stream, index) => (
                <StreamCard key={stream.id} stream={stream} variant="horizontal" index={index} />
              ))}
            </div>
          </section>
        )}
      </div>
      <ProductModal />
    </MainLayout>
  )
}
