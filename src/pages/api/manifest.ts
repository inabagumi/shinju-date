import { NextApiHandler } from 'next'

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
        sizes: '192x192',
        src: favicon192x192,
        type: 'image/png'
      },
      {
        sizes: '512x512',
        src: favicon512x512,
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
