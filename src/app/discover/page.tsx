import type { Metadata } from 'next'
import { getStreams, getProducts } from '@/lib/db'
import { DiscoverView } from './DiscoverView'

export const dynamic = 'force-dynamic'

export default async function DiscoverPage() {
  const [live, upcoming, products] = await Promise.all([
    getStreams({ live: true }),
    getStreams({ live: false, upcoming: true }),
    getProducts({ limit: 100 }),
  ])
  return <DiscoverView streams={[...live, ...upcoming]} products={products} />
}

export const metadata: Metadata = { title: 'Explorar' }
