import { getStream } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getActivePoll, getActiveFlashSale, getStreamAuctions } from '@/lib/engagement'
import { LiveStreamView } from './LiveStreamView'

export const dynamic = 'force-dynamic'

export default async function LiveStreamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [stream, session] = await Promise.all([getStream(id), getSession()])
  if (!stream) return <LiveStreamView stream={null} poll={null} flashSale={null} auctions={[]} />

  const [poll, flashSale, auctions] = await Promise.all([
    getActivePoll(id, session?.user.id),
    getActiveFlashSale(id),
    getStreamAuctions(id, stream.products),
  ])
  return <LiveStreamView stream={stream} poll={poll} flashSale={flashSale} auctions={auctions} />
}
