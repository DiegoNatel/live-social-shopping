import type { Metadata, Viewport } from 'next'
import './globals.css'
import { cookies } from 'next/headers'
import { SessionSync } from '@/components/auth/SessionSync'
import { ModeProvider } from '@/components/layout/ModeProvider'
import { LiveAlerts } from '@/components/layout/LiveAlerts'
import { EarlyInputRestore } from '@/components/layout/EarlyInputRestore'
import { EARLY_INPUT_SCRIPT } from '@/lib/early-input'
import { MODE_COOKIE, parseMode } from '@/lib/mode'

export const metadata: Metadata = {
  // Makes relative preview images (like a live's cover) absolute in shared links
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://watchhaul.com'),
  // Pages set their own title; it shows as "Ofertas | Watchhaul"
  title: { default: 'Watchhaul - Live Social Shopping | Compras ao Vivo', template: '%s | Watchhaul' },
  description: 'A plataforma de live shopping que transforma suas compras em entretenimento. Assista, interaja e compre ao vivo com seus influenciadores favoritos.',
  keywords: ['live shopping', 'compras ao vivo', 'e-commerce', 'brasil', 'influenciadores', 'pix'],
  authors: [{ name: 'Watchhaul' }],
  creator: 'Watchhaul',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    title: 'Watchhaul - Live Social Shopping',
    description: 'A plataforma de live shopping que transforma suas compras em entretenimento.',
    siteName: 'Watchhaul',
  },
  twitter: {
    card: 'summary',
    title: 'Watchhaul - Live Social Shopping',
    description: 'A plataforma de live shopping que transforma suas compras em entretenimento.',
  },
  // Icons and the manifest come from app/icon.png, apple-icon.png, favicon.ico and manifest.ts
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0A1628',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Buyer or seller mode, so the server renders the same menu the browser shows
  const mode = parseMode((await cookies()).get(MODE_COOKIE)?.value)
  return (
    <html lang="pt-BR">
      <head>
        {/* Records typing that happens before React loads, so it isn't lost (lib/early-input.ts) */}
        <script dangerouslySetInnerHTML={{ __html: EARLY_INPUT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-page">
        <SessionSync />
        <ModeProvider initial={mode}>{children}</ModeProvider>
        <LiveAlerts />
        <EarlyInputRestore />
      </body>
    </html>
  )
}

