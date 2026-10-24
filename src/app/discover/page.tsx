import { getStreams, getProducts } from '@/lib/db'
import { DiscoverView } from './DiscoverView'

export const dynamic = 'force-dynamic'

export default async function DiscoverPage() {
  const [live, upcoming, products] = await Promise.all([
    getStreams({ live: true }),
    getStreams({ live: false }),
    getProducts({ limit: 100 }),
  ])
  return <DiscoverView streams={[...live, ...upcoming]} products={products} />
}
