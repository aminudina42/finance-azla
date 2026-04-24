import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Dompet Pintar v3',
    short_name: 'Dompet Pintar',
    description: 'Manajemen keuangan keluarga cerdas untuk Suami dan Istri',
    start_url: '/',
    display: 'standalone',
    background_color: '#0c0c10',
    theme_color: '#0c0c10',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
