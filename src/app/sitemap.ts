import type { MetadataRoute } from 'next'
import { getCreatorUsernames, getProductIds, getStreams } from '@/lib/db'
import { creatorPath } from '@/lib/utils'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://watchhaul.com'

export const dynamic = 'force-dynamic'

// The public pages, plus lives on now, scheduled and recorded
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ['', '/discover', '/deals', '/trending', '/schedule', '/para-vendedores', '/help', '/terms', '/privacy']
  const streams = await Promise.all([
    getStreams({ live: true }),
    getStreams({ live: false, upcoming: true }),
    getStreams({ live: false, ended: true, recorded: true }),
  ]).catch(() => [[], [], []])
  const [productIds, usernames] = await Promise.all([
    getProductIds().catch(() => []),
    getCreatorUsernames().catch(() => []),
  ])
  return [
    ...pages.map(path => ({ url: `${SITE}${path}` })),
    ...streams.flat().map(s => ({ url: `${SITE}/live/${s.id}` })),
    ...productIds.map(id => ({ url: `${SITE}/product/${encodeURIComponent(id)}` })),
    ...usernames.map(u => ({ url: `${SITE}${creatorPath(u)}` })),
  ]
}
