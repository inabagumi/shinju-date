import { NextResponse } from 'next/server'
import { type WebAppManifest } from 'web-app-manifest'
import favicon192x192 from '@/assets/favicon-192x192.png'
import favicon512x512 from '@/assets/favicon-512x512.png'

export function GET(): NextResponse {
  const name = 'SHINJU DATE'

  const body: WebAppManifest = {
    background_color: '#fff',
    display: 'standalone',
    icons: [
      {
        sizes: `${favicon192x192.width}x${favicon192x192.height}`,
        src: favicon192x192.src,
        type: 'image/png'
      },
      {
        sizes: `${favicon512x512.width}x${favicon512x512.height}`,
        src: favicon512x512.src,
        type: 'image/png'
      }
    ],
    name,
    scope: '/',
    short_name: name,
    start_url: '/?utm_source=homescreen',
    theme_color: '#212121'
  }

  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'max-age=60, s-maxage=120',
      'Content-Type': 'application/manifest+json'
    }
  })
}
