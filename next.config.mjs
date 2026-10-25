import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Remote images already carry size params (?w=400); skip Next's optimizer,
    // which would need the Cloudflare Images binding on Workers.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig

// Makes Cloudflare bindings (D1 etc.) available to `next dev` via getCloudflareContext().
// WRANGLER_PERSIST_TO matches `wrangler d1 ... --local --persist-to <dir>` (handy when the
// project path is too long for Windows' 260-char limit).
const persistTo = process.env.WRANGLER_PERSIST_TO
initOpenNextCloudflareForDev(persistTo ? { persist: { path: `${persistTo}/v3` } } : undefined)
