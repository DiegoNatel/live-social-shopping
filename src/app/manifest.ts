import type { MetadataRoute } from 'next'

// Lets phones add Watchhaul to the home screen (served at /manifest.webmanifest)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Watchhaul - Live Social Shopping',
    short_name: 'Watchhaul',
    description: 'A plataforma de live shopping que transforma suas compras em entretenimento.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#0A1628',
    lang: 'pt-BR',
    icons: [{ src: '/icon.png', sizes: '512x512', type: 'image/png' }],
  }
}
