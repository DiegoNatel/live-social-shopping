import { getStreams, getProducts, getCategories } from '@/lib/db'
import { HomeView } from './HomeView'

// Read from D1 on every request
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [liveStreams, upcomingStreams, recordedStreams, trendingProducts, flashDeals, categories] = await Promise.all([
    getStreams({ live: true }),
    getStreams({ live: false }),
    getStreams({ live: false, ended: true, recorded: true }),
    getProducts({ limit: 4 }),
    getProducts({ onSale: true, limit: 4 }),
    getCategories(),
  ])

  return (
    <HomeView
      liveStreams={liveStreams}
      upcomingStreams={upcomingStreams}
      recordedStreams={recordedStreams.slice(0, 6)}
      trendingProducts={trendingProducts}
      flashDeals={flashDeals}
      categories={categories}
    />
  )
}
