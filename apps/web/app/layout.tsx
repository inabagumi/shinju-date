import './globals.css'
import { Analytics } from '@vercel/analytics/react'
import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import SkipLink from '@/components/skip-link'
import { TimerProvider } from '@/components/timer'
import { fetchCurrentTime } from '@/lib/data/videos'
import { publicEnv } from '@/lib/env'
import { SITE_THEME_COLOR, SITE_NAME as siteName } from '@/lib/site'
import { AnnouncementBannerWrapper } from './_components/announcement-banner-wrapper'
import PageVisitTracker from './_components/page-visit-tracker'
import { QueryProvider } from './_components/query-client-provider'
import SearchExitObserver from './_components/search-exit-observer'
import { SearchModalProvider } from './_components/search-modal-context'
import { SearchModalDialog } from './_components/search-modal-dialog'
import { SiteFooter } from './_components/site-footer'
import { SiteHeader } from './_components/site-header'
import SVGSymbols from './_components/svg-symbols'
import { lato } from './_lib/fonts'

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_BASE_URL),
  title: {
    default: siteName,
    template: `%s - ${siteName}`,
  },
}

export const viewport: Viewport = {
  themeColor: SITE_THEME_COLOR,
  viewportFit: 'cover',
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const initialNow = await fetchCurrentTime()

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
        {/* `usePathname()` は動的なルートで Suspense の中に置く */}
        <Suspense fallback={null}>
          <SearchExitObserver />
        </Suspense>
        <QueryProvider>
          <SearchModalProvider>
            <SVGSymbols />

            <SiteHeader />

            <Suspense fallback={null}>
              <SearchModalDialog />
            </Suspense>

            <div className="safe-area-px pb-20 md:pb-40">
              <TimerProvider initialNow={initialNow}>{children}</TimerProvider>
            </div>

            <AnnouncementBannerWrapper />

            <SiteFooter />

            <Analytics />
          </SearchModalProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
