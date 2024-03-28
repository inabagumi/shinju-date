import './globals.css'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { type Metadata, type Viewport } from 'next'
import Link from 'next/link'
import { type ReactNode } from 'react'
import { title as siteName, themeColor } from '@/lib/constants'
import { SearchTextField } from './_components/search-form'
import SVGSymbols from './_components/svg-symbols'
import { search } from './_lib/actions'
import { lato } from './_lib/fonts'

export const metadata: Metadata = {
  metadataBase: process.env['NEXT_PUBLIC_BASE_URL']
    ? new URL(process.env['NEXT_PUBLIC_BASE_URL'])
    : null,
  title: {
    default: siteName,
    template: `%s - ${siteName}`
  }
}

export const viewport: Viewport = {
  themeColor
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className={lato.variable} lang="ja">
      <head prefix="og: http://ogp.me/ns#">
        <link
          href="/opensearch.xml"
          rel="search"
          type="application/opensearchdescription+xml"
        />
      </head>
      <body className="bg-primary-foreground text-primary antialiased">
        <SVGSymbols />

        <nav className="sticky top-0 z-50 flex justify-between gap-6 bg-primary-foreground/60 py-3 px-2 shadow-sm backdrop-blur">
          <Link className="flex items-center gap-2 p-1 font-semibold" href="/">
            <svg className="size-8" role="img">
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
          </div>

          <search className="flex items-center">
            <form action={search} className="contents">
              <SearchTextField
                aria-label="検索"
                className="rounded-full border-0 bg-slate-200 py-1.5 px-4 placeholder:text-slate-500 focus:outline-0"
                name="query"
                placeholder="検索"
                type="search"
              />
            </form>
          </search>
        </nav>

        <div className="pb-20">{children}</div>

        <footer className="bg-primary py-5 text-sm text-white">
          <nav className="mx-auto max-w-6xl py-2 px-4">
            <ul className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-end">
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
        <SpeedInsights />
      </body>
    </html>
  )
}
