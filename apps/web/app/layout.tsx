import 'infima/dist/css/default/default.min.css'
import './globals.css'
import { type Metadata } from 'next'
import { type ReactNode } from 'react'
import appleTouchIcon from '@/assets/apple-touch-icon.png'
import favicon192x192 from '@/assets/favicon-192x192.png'
import favicon512x512 from '@/assets/favicon-512x512.png'
import { SkipNavLink } from '@/ui/skip-nav'
import Analytics from './analytics'
import { title as siteName } from './constants'
import { lato } from './fonts'
import Footer from './footer'
import styles from './layout.module.css'
import Navbar from './navbar'
import Providers from './providers'

export const metadata: Metadata = {
  icons: {
    apple: {
      sizes: `${appleTouchIcon.width}x${appleTouchIcon.height}`,
      url: appleTouchIcon.src
    },
    icon: [
      {
        sizes: `${favicon192x192.width}x${favicon192x192.height}`,
        url: favicon192x192.src
      },
      {
        sizes: `${favicon512x512.width}x${favicon512x512.height}`,
        url: favicon512x512.src
      }
    ]
  },
  manifest: '/manifest.webmanifest',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL),
  themeColor: '#212121',
  title: {
    default: siteName,
    template: `%s - ${siteName}`
  }
}

type Props = {
  children: ReactNode
}

export default function RootLayout({ children }: Props): JSX.Element {
  return (
    <html className={lato.variable} lang="ja">
      <head prefix="og: http://ogp.me/ns#">
        <link
          href="/opensearch.xml"
          rel="search"
          type="application/opensearchdescription+xml"
        />
      </head>
      <body>
        <Providers>
          <div className={styles.wrapper}>
            <SkipNavLink>コンテンツにスキップ</SkipNavLink>

            <Navbar />

            <div className="padding-bottom--xl">{children}</div>

            <Footer />
          </div>

          <Analytics />
        </Providers>
      </body>
    </html>
  )
}
