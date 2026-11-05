import type { Metadata } from 'next'
import { cache } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, Star } from 'lucide-react'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProductDetails } from '@/components/product/ProductDetails'
import { ProductGrid } from '@/components/product/ProductGrid'
import { ProductModal } from '@/components/product/ProductModal'
import { StreamCard } from '@/components/stream/StreamCard'
import { Avatar } from '@/components/ui/Avatar'
import { getProductPage } from '@/lib/db'
import { creatorPath, formatCurrency, formatDate, formatRating } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// Loaded once per request, for both the title/preview and the page
const load = cache((id: string) => getProductPage(id))

// A shared product link shows its name, price and photo on WhatsApp and Instagram
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const data = await load((await params).id)
  if (!data) return { title: 'Produto não encontrado' }
  const { product } = data
  const title = `${product.name} · ${formatCurrency(product.price)}`
  const description = product.description.slice(0, 160) || `Vendido por ${product.seller.name}`
  const images = product.images[0] ? [product.images[0]] : undefined
  return {
    title: product.name,
    description,
    openGraph: { type: 'website', title, description, images },
    twitter: { card: images ? 'summary_large_image' : 'summary', title, description, images },
  }
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const data = await load((await params).id)
  if (!data) notFound()
  const { product, category, reviews, moreFromSeller, streams } = data
  const rating = formatRating(product.rating, product.reviews)

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto md:px-4 md:py-6">
        {/* Breadcrumb */}
        <nav aria-label="Você está em" className="hidden md:flex items-center gap-1 text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-gray-900">Início</Link>
          {category && (
            <>
              <ChevronRight className="w-4 h-4" />
              <Link href={`/?categoria=${encodeURIComponent(category.slug)}`} className="hover:text-gray-900">
                {category.name}
              </Link>
            </>
          )}
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 truncate">{product.name}</span>
        </nav>

        <div className="bg-white md:rounded-md md:shadow-card md:p-6">
          <ProductDetails key={product.id} product={product} />
        </div>

        <div className="px-4 md:px-0">
          {/* Lives showing this product */}
          {streams.length > 0 && (
            <section className="mt-8">
              <h2 className="text-gray-900 font-semibold text-lg mb-3">Nas lives</h2>
              <div className="grid sm:grid-cols-2 gap-2">
                {streams.map((stream, index) => (
                  <StreamCard key={stream.id} stream={stream} variant="horizontal" index={index} />
                ))}
              </div>
            </section>
          )}

          {/* Reviews */}
          <section className="mt-8">
            <h2 className="text-gray-900 font-semibold text-lg mb-3 flex items-center gap-2">
              Avaliações
              {rating && (
                <span className="flex items-center gap-1 text-sm font-normal text-gray-500">
                  <Star className="w-4 h-4 fill-sunset-gold text-sunset-gold" />
                  {rating} · {product.reviews} {product.reviews === 1 ? 'avaliação' : 'avaliações'}
                </span>
              )}
            </h2>
            {reviews.length === 0 ? (
              <p className="bg-white rounded-md shadow-card p-4 text-gray-500 text-sm">
                {product.reviews
                  ? 'Ainda não há comentários escritos sobre este produto.'
                  : 'Ainda sem avaliações. Quem compra pode avaliar depois de receber.'}
              </p>
            ) : (
              <ul className="bg-white rounded-md shadow-card divide-y divide-gray-100">
                {reviews.map((review, i) => (
                  <li key={i} className="p-4 flex gap-3">
                    <Avatar src={review.author.avatar} alt={review.author.name} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-gray-900 text-sm font-medium">{review.author.name.split(' ')[0]}</span>
                        <span className="flex" aria-label={`${review.rating} de 5 estrelas`}>
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star
                              key={n}
                              className={n <= review.rating ? 'w-3.5 h-3.5 fill-sunset-gold text-sunset-gold' : 'w-3.5 h-3.5 text-gray-300'}
                            />
                          ))}
                        </span>
                        <span className="text-gray-400 text-xs">{formatDate(review.createdAt)}</span>
                      </div>
                      {review.comment && <p className="text-gray-600 text-sm mt-1">{review.comment}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* More from the same seller */}
          {moreFromSeller.length > 0 && (
            <section className="mt-8 mb-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-gray-900 font-semibold text-lg">Mais de {product.seller.name}</h2>
                <Link href={creatorPath(product.seller.username)} className="text-sky-blue text-sm hover:underline flex items-center">
                  Ver loja
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <ProductGrid products={moreFromSeller} />
            </section>
          )}
        </div>
      </div>
      <ProductModal />
    </MainLayout>
  )
}
