import { getStreams, getProducts, getCategories } from '@/lib/db'
import { HomeView } from './HomeView'

// Read from D1 on every request
export const dynamic = 'force-dynamic'

// ?categoria=<slug> shows only that category's lives and products
export default async function HomePage({ searchParams }: { searchParams: Promise<{ categoria?: string }> }) {
  const categories = await getCategories()
  const requested = (await searchParams).categoria
  const category = categories.some(c => c.slug === requested) ? requested : undefined

  const [liveStreams, upcomingStreams, recordedStreams, trendingProducts, flashDeals] = await Promise.all([
    getStreams({ live: true, category }),
    getStreams({ live: false, category }),
    getStreams({ live: false, ended: true, recorded: true, category }),
    getProducts({ limit: 4, category }),
    getProducts({ onSale: true, limit: 4, category }),
  ])

  return (
    <HomeView
      liveStreams={liveStreams}
      upcomingStreams={upcomingStreams}
      recordedStreams={recordedStreams.slice(0, 6)}
      trendingProducts={trendingProducts}
      flashDeals={flashDeals}
      categories={categories}
      category={category ?? null}
    />
  )
}
