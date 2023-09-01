import './globals.css'
import { Analytics } from '@vercel/analytics/react'
import { type Metadata } from 'next'
import Link from 'next/link'
import { type ReactNode } from 'react'
import { SkipNavLink } from '@/components/skip-nav'
import { title as siteName, themeColor } from '@/lib/constants'
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

export default function RootLayout({ children }: { children: ReactNode }) {
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
        <svg aria-hidden>
          <defs>
            <symbol id="svg-symbols-square-icon" viewBox="0 0 256 256">
              <rect fill="#212121" height="256" rx="24" width="256" />
              <circle
                cx="97.5"
                cy="100.5"
                r="52"
                stroke="#FAFAFA"
                stroke-width="21"
              />
              <path
                d="M146.14 137l58.34 58.34a5 5 0 010 7.07l-7.07 7.07a5 5 0 01-7.07 0L132 151.14 146.14 137z"
                fill="#FAFAFA"
              />
            </symbol>
            <symbol id="svg-symbols-logo" viewBox="0 0 256 80">
              <path
                d="M44.12 12.53c.12 0 .26.27.42.79.4 1.09.6 2.62.6 4.6 0 2.54-.16 4.06-.48 4.54-.08.69-.22 1.03-.42 1.03a3.74 3.74 0 01-.37-1.27c-.4-.44-.6-1.88-.6-4.3.08-2.14.22-3.6.42-4.36.12-.68.26-1.03.43-1.03zm-8.84 0c.12 0 .26.27.42.79.48 1.09.73 2.62.73 4.6 0 2.54-.19 3.98-.55 4.3-.12.85-.28 1.27-.48 1.27-.2-.16-.37-.58-.49-1.27-.44-.6-.66-2.04-.66-4.3.08-2.14.22-3.6.42-4.36.16-.68.36-1.03.6-1.03zm-16.35-.72c.44 0 .66.42.66 1.27 0 9.48-2.8 16.43-8.41 20.83-.45 0-.67-.08-.67-.25 0-.16.16-.42.49-.78 3.43-4.32 5.87-10.92 7.32-19.8.08-.85.29-1.27.6-1.27zm7.32-.25c.2 0 .3.25.3.73-.23 2.79-.4 6.44-.48 10.96.12 3.03 1.58 5.85 4.36 8.48 4.2 4.32 7.81 8.6 10.84 12.83 5.57 7.87 8.36 15.38 8.36 22.53 0 .48-.09.72-.25.72-.24 0-.36-.24-.36-.72-1.5-7.15-5.09-14.43-10.78-21.86a225.18 225.18 0 00-10.53-12.84 13.21 13.21 0 01-3.57-9.38c0-2.75.52-6.32 1.57-10.72.12-.48.3-.73.54-.73zm68.42 7.09c-3.92 0-7.83.16-11.75.48v2.42c0 9.7 3.82 14.7 11.45 15.02.04-7.27.14-13.24.3-17.92zm-.3 20.1c-9.17-.36-13.75-6.1-13.75-17.2v-3.14c0-2.47.45-3.7 1.34-3.7.4 0 .68.81.84 2.42 3.92-.32 7.9-.48 11.93-.48.04-1.61.1-3.07.18-4.36.2-.77.43-1.15.67-1.15.16 0 .32.3.48.9l.37 4.61c4.07 0 8.09.16 12.04.48.13-1.77.47-2.66 1.03-2.66.81 0 1.25 1.47 1.34 4.42v2.85c0 10.65-4.63 16.32-13.87 17.01v1.4c0 15.82-.2 24.8-.6 26.94-.2.96-.43 1.45-.67 1.45-.16-.16-.32-.65-.48-1.45-.57-3.56-.85-12.54-.85-26.95v-1.39zm2.6-2.18c7.63-.85 11.44-5.85 11.44-15.02v-2.42c-3.87-.32-7.83-.48-11.86-.48.24 5 .38 10.98.42 17.92zm62.18-21.86v-1.87c0-1.3.42-1.94 1.27-1.94.77 0 1.21.64 1.33 1.94v1.87h12.35c1.14.16 1.7.59 1.7 1.27 0 .61-.46.91-1.4.91h-27.72c-.93 0-1.4-.3-1.4-.9 0-.7.65-1.12 1.94-1.28h11.93zm10.72 50.2c-1.3-3.4-2.3-7.35-3.03-11.87a82.15 82.15 0 01-1.27-14.05c0-2.78.28-6.01.85-9.69.8-4.03 1.63-7.58 2.48-10.65.2-.32.4-.49.6-.49.16 0 .25.17.25.49-.49 3.23-.93 6.86-1.34 10.9-.2 3.39-.3 6.54-.3 9.44 0 4.32.26 8.84.79 13.56.48 4 1.17 8.12 2.06 12.36h5.93c1.13 0 1.7.32 1.7.97 0 .8-.45 1.2-1.34 1.2h-34.02c-.9 0-1.34-.4-1.34-1.2 0-.65.63-.97 1.88-.97h4.54a76.82 76.82 0 003.21-11.87c1.13-5.2 1.7-9.97 1.7-14.29 0-4.52-.2-8.8-.6-12.84-.3-2.9-.53-5.16-.74-6.78-.32-.32-.48-.56-.48-.72.04-.17.24-.25.6-.25.49.17 1.12 1.86 1.88 5.09 1.3 5 1.94 10.17 1.94 15.5 0 4.32-.6 8.92-1.82 13.8a55.99 55.99 0 01-4.42 12.36h20.29zm66.72.78c.76.65 1.15 1.13 1.15 1.46 0 .12-.1.18-.3.18-.25 0-.71-.24-1.4-.73a122.15 122.15 0 01-17.44-14.47c-3.83-3.75-5.75-7.33-5.75-10.72 0-3.87 2.06-8.47 6.18-13.8a69.88 69.88 0 0110.6-11.32h-18.78c-1.25 0-1.87-.35-1.87-1.03 0-.77.62-1.15 1.88-1.15l10.53.06 9.02.06a11 11 0 002.97-.49c1.17-.32 1.9-.48 2.18-.48.56 0 .85.1.85.3 0 .12-1 .93-2.97 2.42a64.59 64.59 0 00-12.23 12.6c-3.84 5.16-5.75 9.42-5.75 12.77 0 2.3 1.45 5.13 4.36 8.48 3.06 3.43 8.65 8.72 16.77 15.86z"
                fill="currentColor"
              />
            </symbol>
          </defs>
        </svg>
        <Providers>
          <div className={styles.wrapper}>
            <SkipNavLink>コンテンツにスキップ</SkipNavLink>

            <Navbar />

            <div className="padding-bottom--xl">{children}</div>

            <footer className="footer footer--dark">
              <div className="container container--fluid">
                <nav className="footer__links">
                  <a
                    className="footer__link-item"
                    href="https://haneru.dev/"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    運営者情報
                  </a>
                  <span className="footer__link-separator">·</span>
                  <Link className="footer__link-item" href="/terms">
                    利用規約
                  </Link>
                  <span className="footer__link-separator">·</span>
                  <Link className="footer__link-item" href="/privacy">
                    プライバシーポリシー
                  </Link>
                </nav>
              </div>
            </footer>
          </div>

          <Analytics />
        </Providers>
      </body>
    </html>
  )
}
