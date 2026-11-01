import type { MetadataRoute } from 'next'

// Lets phones add Luma to the home screen (served at /manifest.webmanifest)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Luma - Live Social Shopping',
    short_name: 'Luma',
    description: 'A plataforma de live shopping que transforma suas compras em entretenimento.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#0A1628',
    lang: 'pt-BR',
    icons: [{ src: '/icon.png', sizes: '512x512', type: 'image/png' }],
  }
}
