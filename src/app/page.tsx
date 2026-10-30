import { getStreams, getProducts, getCategories, getUser } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { liveMatchesInterests } from '@/lib/interests'
import { HomeView } from './HomeView'

// Read from D1 on every request
export const dynamic = 'force-dynamic'

// ?categoria=<slug> shows only that category's lives and products
export default async function HomePage({ searchParams }: { searchParams: Promise<{ categoria?: string }> }) {
  const [categories, session] = await Promise.all([getCategories(), getSession()])
  const requested = (await searchParams).categoria
  const category = categories.some(c => c.slug === requested) ? requested : undefined

  const [liveStreams, upcomingStreams, recordedStreams, trendingProducts, flashDeals, profile] = await Promise.all([
    getStreams({ live: true, category }),
    getStreams({ live: false, category }),
    getStreams({ live: false, ended: true, recorded: true, category }),
    getProducts({ limit: 4, category }),
    getProducts({ onSale: true, limit: 4, category }),
    session ? getUser(session.user.id) : null,
  ])

  // "Para você": lives on now (then upcoming) matching the user's interests, by category or hashtag
  const interests = profile?.interests ?? []
  const forYou = category || interests.length === 0
    ? []
    : [...liveStreams, ...upcomingStreams].filter(s => liveMatchesInterests(s, interests)).slice(0, 6)

  return (
    <HomeView
      liveStreams={liveStreams}
      upcomingStreams={upcomingStreams}
      recordedStreams={recordedStreams.slice(0, 6)}
      trendingProducts={trendingProducts}
      flashDeals={flashDeals}
      categories={categories}
      category={category ?? null}
      forYou={forYou}
    />
  )
}
