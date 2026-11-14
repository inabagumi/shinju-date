import { SITE_NAME as siteName } from '@shinju-date/constants'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ContactLink } from './contact-link'
import { NavLink } from './nav-link'

const footerLinkClassName =
  'flex min-h-11 items-center rounded-control underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground'

interface FooterLinkGroupProps {
  children: ReactNode
  title: string
}

function FooterLinkGroup({ children, title }: FooterLinkGroupProps) {
  return (
    <div>
      <h2 className="text-meta font-bold">{title}</h2>
      <ul className="mt-2 text-meta">{children}</ul>
    </div>
  )
}

/**
 * サイト全体のフッター。何のサイトで、ファンによる非公式サイトであることを
 * 示し、リンクを「サービス」「サポート」「規約」のまとまりで並べる。
 */
export function SiteFooter() {
  return (
    <footer className="bg-primary safe-area-px safe-area-pb-footer text-primary-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-10 pb-4 md:grid-cols-[minmax(0,1fr)_auto] md:gap-12">
        <div>
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-control font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
            href="/"
          >
            <svg aria-hidden="true" className="size-8" role="img">
              <use xlinkHref="#svg-symbols-square-icon" />
            </svg>
            {siteName}
          </Link>
          <p className="mt-2 max-w-sm text-meta">
            ななしいんく所属タレントの配信スケジュールと動画を検索できるサービス
          </p>
          <p className="mt-2 text-caption">ファンによる非公式サイトです</p>
        </div>

        <nav
          aria-label="フッター"
          className="grid gap-6 sm:grid-cols-3 sm:gap-12"
        >
          <FooterLinkGroup title="サービス">
            <li>
              <NavLink className={footerLinkClassName} href="/about">
                {siteName}とは
              </NavLink>
            </li>
            <li>
              <NavLink className={footerLinkClassName} href="/videos">
                動画一覧
              </NavLink>
            </li>
          </FooterLinkGroup>

          <FooterLinkGroup title="サポート">
            <li className="empty:hidden">
              <ContactLink className={footerLinkClassName}>
                お問い合わせ
              </ContactLink>
            </li>
            <li>
              <NavLink className={footerLinkClassName} href="/feedback">
                機能要望
              </NavLink>
            </li>
          </FooterLinkGroup>

          <FooterLinkGroup title="規約">
            <li>
              <NavLink className={footerLinkClassName} href="/terms">
                利用規約
              </NavLink>
            </li>
            <li>
              <NavLink className={footerLinkClassName} href="/privacy">
                プライバシーポリシー
              </NavLink>
            </li>
            <li>
              <a
                className={footerLinkClassName}
                href="https://haneru.dev/"
                rel="noopener noreferrer"
                target="_blank"
              >
                運営者情報
              </a>
            </li>
          </FooterLinkGroup>
        </nav>
      </div>
    </footer>
  )
}
