import './globals.css'
import { SITE_THEME_COLOR, SITE_NAME as siteName } from '@shinju-date/constants'
import { Analytics } from '@vercel/analytics/react'
import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import PageVisitTracker from '@/components/page-visit-tracker'
import SkipLink from '@/components/skip-link'
import { TimerProvider } from '@/components/timer'
import { AnnouncementBannerWrapper } from './_components/announcement-banner-wrapper'
import { Providers } from './_components/providers'
import { SearchModalProvider } from './_components/search-modal-context'
import { SearchModalDialog } from './_components/search-modal-dialog'
import { SiteFooter } from './_components/site-footer'
import { SiteHeader } from './_components/site-header'
import SVGSymbols from './_components/svg-symbols'
import { lato } from './_lib/fonts'

export const metadata: Metadata = {
  metadataBase: process.env['NEXT_PUBLIC_BASE_URL']
    ? new URL(process.env['NEXT_PUBLIC_BASE_URL'])
    : null,
  title: {
    default: siteName,
    template: `%s - ${siteName}`,
  },
}

export const viewport: Viewport = {
  themeColor: SITE_THEME_COLOR,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html className={lato.variable} lang="ja">
      <head prefix="og: http://ogp.me/ns#">
        <link
          href="/opensearch.xml"
          rel="search"
          type="application/opensearchdescription+xml"
        />
      </head>
      <body className="grid min-h-svh grid-rows-[auto_1fr_auto] bg-background text-foreground antialiased">
        <SkipLink />
        <PageVisitTracker />
        <Providers>
          <SearchModalProvider>
            <SVGSymbols />

            <SiteHeader />

            <Suspense fallback={null}>
              <SearchModalDialog />
            </Suspense>

            <div className="safe-area-px pb-20 md:pb-40">
              <TimerProvider>{children}</TimerProvider>
            </div>

            <AnnouncementBannerWrapper />

            <SiteFooter />

            <Analytics />
          </SearchModalProvider>
        </Providers>
      </body>
    </html>
  )
}
