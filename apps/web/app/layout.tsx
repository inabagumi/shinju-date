import './globals.css'
import { Analytics } from '@vercel/analytics/react'
import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { AnnouncementBannerWrapper } from '@/components/announcement-banner-wrapper'
import PageVisitTracker from '@/components/page-visit-tracker'
import { TimerProvider } from '@/components/timer'
import { title as siteName, themeColor } from '@/lib/constants'
import { ContactLink } from './_components/contact-link'
import { Providers } from './_components/providers'
import { SearchButton } from './_components/search-button'
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
  themeColor,
}

export default function RootLayout({ children, modal }: LayoutProps<'/'>) {
  return (
    <html className={lato.variable} lang="ja">
      <head prefix="og: http://ogp.me/ns#">
        <link
          href="/opensearch.xml"
          rel="search"
          type="application/opensearchdescription+xml"
        />
      </head>
      <body className="grid min-h-svh grid-rows-[auto_1fr_auto] bg-primary-foreground text-primary antialiased dark:bg-zinc-900 dark:text-774-nevy-50">
        <PageVisitTracker />
        <Providers>
          <SVGSymbols />

          <nav className="sticky top-0 z-50 flex justify-between gap-6 bg-primary-foreground/60 px-2 py-3 shadow-md backdrop-blur dark:bg-zinc-900/60">
            <Link
              className="flex items-center gap-2 p-1 font-semibold"
              href="/"
            >
              <svg
                aria-hidden="true"
                className="hidden size-8 sm:inline-block"
                role="img"
              >
                <use xlinkHref="#svg-symbols-square-icon" />
              </svg>
              {siteName}
            </Link>

            <div className="hidden grow items-center gap-4 md:flex">
              <Link
                className="hover:text-secondary-pink hover:underline"
                href="/about"
              >
                {siteName}とは
              </Link>
              <Link
                className="hover:text-secondary-pink hover:underline"
                href="/videos"
              >
                動画一覧
              </Link>
              <ContactLink className="hover:text-secondary-pink hover:underline">
                お問い合わせ
              </ContactLink>
            </div>

            <search className="flex items-center">
              <SearchButton />
            </search>
          </nav>

          {modal}

          <div className="pb-20 md:pb-40">
            <TimerProvider>{children}</TimerProvider>
          </div>

          <footer className="bg-primary py-5 text-primary-foreground text-sm dark:bg-zinc-800">
            <nav className="mx-auto max-w-6xl px-4 py-2">
              <ul className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-end">
                <li>
                  <a
                    className="hover:text-secondary-pink hover:underline"
                    href="https://haneru.dev/"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    運営者情報
                  </a>
                </li>
                <li className="md:hidden">
                  <Link
                    className="hover:text-secondary-pink hover:underline"
                    href="/about"
                  >
                    {siteName}とは
                  </Link>
                </li>
                <li className="md:hidden">
                  <ContactLink className="hover:text-secondary-pink hover:underline">
                    お問い合わせ
                  </ContactLink>
                </li>
                <li>
                  <Link
                    className="hover:text-secondary-pink hover:underline"
                    href="/terms"
                  >
                    利用規約
                  </Link>
                </li>
                <li>
                  <Link
                    className="hover:text-secondary-pink hover:underline"
                    href="/privacy"
                  >
                    プライバシーポリシー
                  </Link>
                </li>
              </ul>
            </nav>
          </footer>

          <Analytics />
          <AnnouncementBannerWrapper />
        </Providers>
      </body>
    </html>
  )
}
