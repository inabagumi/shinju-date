import './globals.css'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { type Metadata, type Viewport } from 'next'
import Link from 'next/link'
import { type ReactNode } from 'react'
import { SkipNavLink } from '@/components/skip-nav'
import { title as siteName, themeColor } from '@/lib/constants'
import Navbar, {
  NavbarBrand,
  NavbarInner,
  NavbarItem,
  NavbarItems,
  NavbarSidebar,
  NavbarSidebarBrand,
  NavbarSidebarMenu,
  NavbarSidebarMenuItem,
  NavbarToggle,
  ThemeToggleButton
} from './_components/navbar'
import Providers from './_components/providers'
import SearchForm from './_components/search-form'
import SVGSymbols from './_components/svg-symbols'
import { lato } from './_lib/fonts'
import styles from './layout.module.css'

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_BASE_URL
    ? new URL(process.env.NEXT_PUBLIC_BASE_URL)
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
    <html className={lato.variable} lang="ja" suppressHydrationWarning>
      <head prefix="og: http://ogp.me/ns#">
        <link
          href="/opensearch.xml"
          rel="search"
          type="application/opensearchdescription+xml"
        />
      </head>
      <body>
        <SVGSymbols />

        <Providers>
          <div className={styles.wrapper}>
            <SkipNavLink>コンテンツにスキップ</SkipNavLink>

            <Navbar>
              <NavbarInner>
                <NavbarItems>
                  <NavbarToggle />

                  <NavbarBrand href="/">{siteName}</NavbarBrand>

                  <NavbarItem href="/about">{siteName}とは</NavbarItem>
                  <NavbarItem href="/videos">動画一覧</NavbarItem>
                </NavbarItems>
                <NavbarItems right>
                  <ThemeToggleButton />

                  <SearchForm />
                </NavbarItems>
              </NavbarInner>

              <NavbarSidebar>
                <NavbarSidebarBrand href="/">{siteName}</NavbarSidebarBrand>

                <NavbarSidebarMenu>
                  <NavbarSidebarMenuItem href="/">
                    配信予定
                  </NavbarSidebarMenuItem>
                  <NavbarSidebarMenuItem href="/videos">
                    動画一覧
                  </NavbarSidebarMenuItem>
                  <NavbarSidebarMenuItem href="/about">
                    {siteName}とは
                  </NavbarSidebarMenuItem>
                </NavbarSidebarMenu>
              </NavbarSidebar>
            </Navbar>

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
        </Providers>

        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
