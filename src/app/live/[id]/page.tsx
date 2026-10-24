import { getStream } from '@/lib/db'
import { LiveStreamView } from './LiveStreamView'

export const dynamic = 'force-dynamic'

export default async function LiveStreamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <LiveStreamView stream={await getStream(id)} />
}
