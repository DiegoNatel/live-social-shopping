import { redirect } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { EmptyState } from '@/components/ui/EmptyState'
import { getSession } from '@/lib/auth'
import { getReviewItems } from '@/lib/reviews'
import { ReviewList } from './ReviewList'

export const dynamic = 'force-dynamic'

export default async function ReviewsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const items = await getReviewItems(session.user.id)

  return (
    <MainLayout headerProps={{ title: 'Minhas avaliações' }}>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {items.length ? (
          <ReviewList items={items} />
        ) : (
          <EmptyState
            title="Nada para avaliar ainda"
            text="Depois de comprar, você pode avaliar os produtos aqui."
            href="/discover"
            linkLabel="Explorar produtos"
          />
        )}
      </div>
    </MainLayout>
  )
}
