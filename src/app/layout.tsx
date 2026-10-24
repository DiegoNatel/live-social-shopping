import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SessionSync } from '@/components/auth/SessionSync'

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
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0A1628',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-page">
        <SessionSync />
        {children}
      </body>
    </html>
  )
}

