import { getStreams, getProducts, getCourses } from '@/lib/db'
import { HomeView } from './HomeView'

// Read from D1 on every request
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [liveStreams, upcomingStreams, trendingProducts, flashDeals, featuredCourses] = await Promise.all([
    getStreams({ live: true }),
    getStreams({ live: false }),
    getProducts({ limit: 4 }),
    getProducts({ onSale: true, limit: 4 }),
    getCourses({ limit: 4 }),
  ])

  return (
    <HomeView
      liveStreams={liveStreams}
      upcomingStreams={upcomingStreams}
      trendingProducts={trendingProducts}
      flashDeals={flashDeals}
      featuredCourses={featuredCourses}
    />
  )
}
