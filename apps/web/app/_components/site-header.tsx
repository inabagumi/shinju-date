import Link from 'next/link'
import { SITE_NAME as siteName } from '@/lib/site'
import { MainNavigationItems } from './main-navigation-items'
import { MobileMenu } from './mobile-menu'
import { SearchButton } from './search-button'

const navigationLinkClassName =
  'rounded-control underline-offset-4 hover:underline focus-ring aria-[current=page]:font-bold aria-[current=page]:text-accent'

/**
 * サイト全体のヘッダー。高さは 56px に固定し、スクロールしても地を不透明に保つ。
 * PC では検索欄を幅のある入力欄の形で表示し、モバイルではナビゲーションを
 * メニューボタンの中にしまう。
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 h-14 border-b border-border bg-surface safe-area-px text-foreground">
      <div className="mx-auto flex h-full max-w-6xl items-center gap-3 px-4 md:gap-8">
        <Link
          className="flex shrink-0 items-center gap-2 rounded-control font-semibold whitespace-nowrap focus-ring"
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

        <nav aria-label="メイン" className="hidden shrink-0 md:block">
          <ul className="flex items-center gap-6 text-meta">
            <MainNavigationItems linkClassName={navigationLinkClassName} />
          </ul>
        </nav>

        <search className="flex min-w-0 grow items-center justify-end">
          <SearchButton />
        </search>

        <MobileMenu>
          <nav aria-label="メイン">
            <ul className="mx-auto flex max-w-6xl flex-col py-2">
              <MainNavigationItems linkClassName="block px-4 py-3 hover:bg-muted hover:underline underline-offset-4 aria-[current=page]:font-bold aria-[current=page]:text-accent" />
            </ul>
          </nav>
        </MobileMenu>
      </div>
    </header>
  )
}
