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
