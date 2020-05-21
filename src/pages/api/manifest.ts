import { NextApiHandler } from 'next'

import { favicon192x192, favicon512x512 } from '@/assets'

const handler: NextApiHandler<WebAppManifest> = (_req, res) => {
  const name = process.env.NEXT_PUBLIC_TITLE
  const icons = [
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
  ]

  res.setHeader('Cache-Control', 'max-age=60, s-maxage=120')
  res.setHeader('Content-Type', 'application/manifest+json')
  res.status(200).json({
    // eslint-disable-next-line @typescript-eslint/camelcase
    background_color: '#fff',
    display: 'standalone',
    icons,
    name,
    scope: '/',
    // eslint-disable-next-line @typescript-eslint/camelcase
    short_name: name,
    // eslint-disable-next-line @typescript-eslint/camelcase
    start_url: '/?utm_source=homescreen',
    // eslint-disable-next-line @typescript-eslint/camelcase
    theme_color: '#212121'
  })
}

export default handler
