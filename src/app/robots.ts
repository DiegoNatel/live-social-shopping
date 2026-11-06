import type { MetadataRoute } from 'next'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://watchhaul.com'

// Search engines may read the shop, not accounts, checkout, the seller area or the API
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin', '/seller/', '/checkout', '/cart', '/orders', '/settings', '/addresses', '/reset-password'],
    },
    sitemap: `${SITE}/sitemap.xml`,
  }
}
