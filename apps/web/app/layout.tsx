import './globals.css'
import { Analytics } from '@vercel/analytics/react'
import { type Metadata, type Viewport } from 'next'
import Link from 'next/link'
import { type ReactNode } from 'react'
import { TimerProvider } from '@/components/timer'
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
      <body className="grid min-h-svh grid-rows-[auto_1fr_auto] bg-primary-foreground text-primary antialiased dark:bg-zinc-900 dark:text-774-nevy-50">
        <SVGSymbols />

        <nav className="sticky top-0 z-50 flex justify-between gap-6 bg-primary-foreground/60 py-3 px-2 shadow-md backdrop-blur dark:bg-zinc-900/60">
          <Link className="flex items-center gap-2 p-1 font-semibold" href="/">
            <svg className="hidden size-8 sm:inline-block" role="img">
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
                className="appearance-none rounded-full border-0 bg-774-nevy-100 bg-search-icon bg-[size:1.5em] bg-[0.6em_center] bg-no-repeat py-1.5 pr-4 pl-[2.25em] text-774-nevy-300 placeholder:text-774-nevy-300 hover:bg-774-nevy-200 hover:text-primary focus:outline-0 focus-visible:bg-774-nevy-200 focus-visible:text-primary focus-visible:placeholder:text-774-nevy-400 dark:bg-zinc-700 dark:bg-search-icon-invert dark:text-774-nevy-50 dark:text-774-nevy-100 dark:placeholder:text-774-nevy-200 dark:hover:bg-zinc-600 dark:hover:text-774-nevy-100 dark:focus-visible:bg-zinc-600 dark:focus-visible:text-774-nevy-50 dark:focus-visible:text-774-nevy-100 dark:focus-visible:placeholder:text-774-nevy-100"
                name="query"
                placeholder="検索"
                type="search"
              />
            </form>
          </search>
        </nav>

        <div className="pb-20 md:pb-40">
          <TimerProvider>{children}</TimerProvider>
        </div>

        <footer className="bg-primary py-5 text-sm text-primary-foreground dark:bg-zinc-800">
          <nav className="mx-auto max-w-6xl py-2 px-4">
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
      </body>
    </html>
  )
}
