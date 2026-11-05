import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Don't announce the framework (X-Powered-By: Next.js)
  poweredByHeader: false,
  // Standard security headers on every response. No full Content-Security-Policy yet: LiveKit,
  // Asaas and remote product images need an allowlist that should be tested first.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Nobody can frame the site (stops clickjacking on login and checkout)
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Camera and microphone stay available to this site for sellers going live
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(), payment=()' },
        ],
      },
    ]
  },
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
