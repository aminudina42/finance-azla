import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Catat Keluarga',
    short_name: 'Catat Keluarga',
    description: 'Manajemen keuangan keluarga cerdas bersama pasangan',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7fbff',
    theme_color: '#287ff0',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/logo-icon.png',
        sizes: '2000x2000',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
