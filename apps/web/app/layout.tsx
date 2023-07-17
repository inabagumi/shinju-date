import './globals.css'
import { Analytics } from '@vercel/analytics/react'
import { type Metadata } from 'next'
import { type ReactNode } from 'react'
import { SkipNavLink } from '@/components/skip-nav'
import { title as siteName, themeColor } from '@/lib/constants'
import Footer from './_components/footer'
import Navbar from './_components/navbar'
import Providers from './_components/providers'
import { lato } from './_lib/fonts'
import styles from './layout.module.css'

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_BASE_URL
    ? new URL(process.env.NEXT_PUBLIC_BASE_URL)
    : null,
  themeColor,
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
    <html className={lato.variable} lang="ja" suppressHydrationWarning>
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
