import type { Metadata, Viewport } from 'next'
import './globals.css'
import { cookies } from 'next/headers'
import { SessionSync } from '@/components/auth/SessionSync'
import { ModeProvider } from '@/components/layout/ModeProvider'
import { LiveAlerts } from '@/components/layout/LiveAlerts'
import { MODE_COOKIE, parseMode } from '@/lib/mode'

export const metadata: Metadata = {
  title: 'VivoBuy - Live Social Shopping | Compras ao Vivo',
  description: 'A plataforma de live shopping que transforma suas compras em entretenimento. Assista, interaja e compre ao vivo com seus influenciadores favoritos.',
  keywords: ['live shopping', 'compras ao vivo', 'e-commerce', 'brasil', 'influenciadores', 'pix'],
  authors: [{ name: 'VivoBuy' }],
  creator: 'VivoBuy',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://vivobuy.com.br',
    title: 'VivoBuy - Live Social Shopping',
    description: 'A plataforma de live shopping que transforma suas compras em entretenimento.',
    siteName: 'VivoBuy',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VivoBuy - Live Social Shopping',
    description: 'A plataforma de live shopping que transforma suas compras em entretenimento.',
  },
  // Icons and the manifest come from app/icon.png, apple-icon.png, favicon.ico and manifest.ts
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
      <body className="min-h-screen bg-page">
        <SessionSync />
        <ModeProvider initial={mode}>{children}</ModeProvider>
        <LiveAlerts />
      </body>
    </html>
  )
}

