import type { Metadata } from 'next'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { getStream } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getActivePoll, getActiveFlashSale, getStreamAuctions } from '@/lib/engagement'
import { LiveStreamView } from './LiveStreamView'

export const dynamic = 'force-dynamic'

// Loaded once per request, for both the title/preview and the page
const loadStream = cache((id: string) => getStream(id))

// A shared live link shows its own title, seller and cover on WhatsApp and Instagram
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const stream = await loadStream((await params).id)
  if (!stream) return { title: 'Live não encontrada' }
  const title = `${stream.title} · ${stream.host.name}`
  const description = stream.description || `Assista e compre ao vivo com ${stream.host.name} na Luma.`
  const images = stream.thumbnail ? [stream.thumbnail] : undefined
  return {
    title,
    description,
    openGraph: { type: 'video.other', title, description, images },
    twitter: { card: images ? 'summary_large_image' : 'summary', title, description, images },
  }
}

export default async function LiveStreamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [stream, session] = await Promise.all([loadStream(id), getSession()])
  if (!stream) notFound()

  // Polls, flash sales and auctions belong to the broadcast: none once the live has ended
  const ended = !stream.isLive && !!stream.hasEnded
  const [poll, flashSale, auctions] = ended
    ? [null, null, []]
    : await Promise.all([
        getActivePoll(id, session?.user.id),
        getActiveFlashSale(id),
        getStreamAuctions(id, stream.products),
      ] as const)
  return <LiveStreamView stream={stream} poll={poll} flashSale={flashSale} auctions={auctions} />
}
