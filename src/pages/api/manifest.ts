import type { NextApiHandler } from 'next'
import type { WebAppManifest } from 'web-app-manifest'

import { favicon192x192, favicon512x512 } from '@/assets'

const handler: NextApiHandler<WebAppManifest> = (_req, res) => {
  const name = 'SHINJU DATE'

  res.setHeader('Cache-Control', 'max-age=60, s-maxage=120')
  res.setHeader('Content-Type', 'application/manifest+json')
  res.status(200).json({
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
  })
}

export default handler
