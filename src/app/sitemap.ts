import type { MetadataRoute } from 'next'
import { getStreams } from '@/lib/db'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://vivobuy.diegonatel.workers.dev'

export const dynamic = 'force-dynamic'

// The public pages, plus lives on now, scheduled and recorded
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ['', '/discover', '/deals', '/trending', '/schedule', '/vender', '/help', '/terms', '/privacy']
  const streams = await Promise.all([
    getStreams({ live: true }),
    getStreams({ live: false, upcoming: true }),
    getStreams({ live: false, ended: true, recorded: true }),
  ]).catch(() => [[], [], []])
  return [
    ...pages.map(path => ({ url: `${SITE}${path}` })),
    ...streams.flat().map(s => ({ url: `${SITE}/live/${s.id}` })),
  ]
}
