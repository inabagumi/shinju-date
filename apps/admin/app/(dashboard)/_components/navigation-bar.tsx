'use client'

import { Menu, User, X } from 'lucide-react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { type ComponentProps, Suspense, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import Form, { SubmitButton } from '@/components/form'
import { signOut } from '../_lib/actions'

interface NavigationLinkProps extends ComponentProps<typeof NextLink> {
  activeClassName?: string
}

function ActiveNavigationLink({
  activeClassName = 'bg-slate-600',
  className,
  href,
  ...props
}: NavigationLinkProps) {
  const pathname = usePathname()
  const path = typeof href === 'string' ? href : href.pathname

  return (
    <NextLink
      {...props}
      aria-current={pathname === path ? 'page' : undefined}
      className={twMerge(className, pathname === path && activeClassName)}
      href={href}
    />
  )
}

function Link(props: NavigationLinkProps) {
  const { activeClassName: _, ...linkProps } = props

  return (
    <Suspense fallback={<NextLink {...linkProps} />}>
      <ActiveNavigationLink {...props} />
    </Suspense>
  )
}

export function NavigationBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false)
  const [isAnalyticsMenuOpen, setIsAnalyticsMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-slate-800 text-slate-50">
      {/* Desktop Navigation */}
      <div className="mx-auto hidden max-w-7xl items-center gap-4 p-2 md:flex">
        <NextLink className="inline-block p-2 font-semibold text-xl" href="/">
          Admin UI
        </NextLink>
        <div className="flex grow items-center gap-4">
          {/* データ管理 Dropdown */}
          <div className="relative">
            <button
              className="rounded-md px-3 py-1 hover:bg-slate-700"
              onClick={() => {
                setIsDataMenuOpen(!isDataMenuOpen)
                setIsAnalyticsMenuOpen(false)
                setIsUserMenuOpen(false)
              }}
              onMouseEnter={() => {
                setIsDataMenuOpen(true)
                setIsAnalyticsMenuOpen(false)
                setIsUserMenuOpen(false)
              }}
              type="button"
            >
              データ管理 ▾
            </button>
            {isDataMenuOpen && (
              <div
                className="absolute top-full left-0 z-50 mt-1 min-w-[200px] rounded-md border border-slate-600 bg-slate-700 py-1 shadow-lg"
                onMouseLeave={() => setIsDataMenuOpen(false)}
                role="menu"
              >
                <Link
                  className="block px-4 py-2 hover:bg-slate-600"
                  href="/videos"
                  onClick={() => setIsDataMenuOpen(false)}
                  prefetch={true}
                >
                  動画管理
                </Link>
                <Link
                  className="block px-4 py-2 hover:bg-slate-600"
                  href="/talents"
                  onClick={() => setIsDataMenuOpen(false)}
                >
                  タレント管理
                </Link>
                <Link
                  className="block px-4 py-2 hover:bg-slate-600"
                  href="/terms"
                  onClick={() => setIsDataMenuOpen(false)}
                >
                  用語管理
                </Link>
                <Link
                  className="block px-4 py-2 hover:bg-slate-600"
                  href="/recommended-queries"
                  onClick={() => setIsDataMenuOpen(false)}
                >
                  オススメクエリ管理
                </Link>
                <Link
                  className="block px-4 py-2 hover:bg-slate-600"
                  href="/announcements"
                  onClick={() => setIsDataMenuOpen(false)}
                >
                  お知らせ管理
                </Link>
                <Link
                  className="block px-4 py-2 hover:bg-slate-600"
                  href="/feedback"
                  onClick={() => setIsDataMenuOpen(false)}
                >
                  機能要望管理
                </Link>
              </div>
            )}
          </div>

          {/* アナリティクス Dropdown */}
          <div className="relative">
            <button
              className="rounded-md px-3 py-1 hover:bg-slate-700"
              onClick={() => {
                setIsAnalyticsMenuOpen(!isAnalyticsMenuOpen)
                setIsDataMenuOpen(false)
                setIsUserMenuOpen(false)
              }}
              onMouseEnter={() => {
                setIsAnalyticsMenuOpen(true)
                setIsDataMenuOpen(false)
                setIsUserMenuOpen(false)
              }}
              type="button"
            >
              アナリティクス ▾
            </button>
            {isAnalyticsMenuOpen && (
              <div
                className="absolute top-full left-0 z-50 mt-1 min-w-[200px] rounded-md border border-slate-600 bg-slate-700 py-1 shadow-lg"
                onMouseLeave={() => setIsAnalyticsMenuOpen(false)}
                role="menu"
              >
                <Link
                  className="block px-4 py-2 hover:bg-slate-600"
                  href="/analytics/search"
                  onClick={() => setIsAnalyticsMenuOpen(false)}
                  prefetch={true}
                >
                  検索アナリティクス
                </Link>
                <Link
                  className="block px-4 py-2 hover:bg-slate-600"
                  href="/analytics/click"
                  onClick={() => setIsAnalyticsMenuOpen(false)}
                  prefetch={true}
                >
                  クリックアナリティクス
                </Link>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* User Menu Dropdown */}
          <div className="relative">
            <button
              aria-label="ユーザーメニュー"
              className="rounded-md px-3 py-1 hover:bg-slate-700"
              onClick={() => {
                setIsUserMenuOpen(!isUserMenuOpen)
                setIsDataMenuOpen(false)
                setIsAnalyticsMenuOpen(false)
              }}
              onMouseEnter={() => {
                setIsUserMenuOpen(true)
                setIsDataMenuOpen(false)
                setIsAnalyticsMenuOpen(false)
              }}
              type="button"
            >
              <User className="h-6 w-6" />
            </button>
            {isUserMenuOpen && (
              <div
                className="absolute top-full right-0 z-50 mt-1 min-w-[200px] rounded-md border border-slate-600 bg-slate-700 py-1 shadow-lg"
                onMouseLeave={() => setIsUserMenuOpen(false)}
                role="menu"
              >
                <Link
                  className="block px-4 py-2 hover:bg-slate-600"
                  href="/account"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  アカウント設定
                </Link>
                <Link
                  className="block px-4 py-2 hover:bg-slate-600"
                  href="/system"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  システム
                </Link>
                <div className="my-2 border-slate-600 border-t" />
                <Form action={signOut}>
                  <SubmitButton
                    className="w-full px-4 py-2 text-left hover:bg-slate-600 focus-visible:bg-slate-600 focus-visible:outline-none"
                    type="submit"
                  >
                    ログアウト
                  </SubmitButton>
                </Form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="mx-auto flex max-w-7xl items-center justify-between p-2 md:hidden">
        <NextLink className="inline-block p-2 font-semibold text-xl" href="/">
          Admin UI
        </NextLink>
        <button
          aria-label="メニューを開く"
          className="rounded-md p-2 hover:bg-slate-700"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          type="button"
        >
          {isMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="border-slate-700 border-t md:hidden">
          <div className="space-y-1 p-2">
            <div className="space-y-1">
              <div className="px-3 py-2 font-semibold text-sm">データ管理</div>
              <Link
                activeClassName="bg-slate-700"
                className="block rounded-md px-6 py-2 hover:bg-slate-700"
                href="/videos"
                onClick={() => setIsMenuOpen(false)}
                prefetch={true}
              >
                動画管理
              </Link>
              <Link
                activeClassName="bg-slate-700"
                className="block rounded-md px-6 py-2 hover:bg-slate-700"
                href="/talents"
                onClick={() => setIsMenuOpen(false)}
              >
                タレント管理
              </Link>
              <Link
                activeClassName="bg-slate-700"
                className="block rounded-md px-6 py-2 hover:bg-slate-700"
                href="/terms"
                onClick={() => setIsMenuOpen(false)}
              >
                用語管理
              </Link>
              <Link
                activeClassName="bg-slate-700"
                className="block rounded-md px-6 py-2 hover:bg-slate-700"
                href="/recommended-queries"
                onClick={() => setIsMenuOpen(false)}
              >
                オススメクエリ管理
              </Link>
              <Link
                activeClassName="bg-slate-700"
                className="block rounded-md px-6 py-2 hover:bg-slate-700"
                href="/announcements"
                onClick={() => setIsMenuOpen(false)}
              >
                お知らせ管理
              </Link>
              <Link
                activeClassName="bg-slate-700"
                className="block rounded-md px-6 py-2 hover:bg-slate-700"
                href="/feedback"
                onClick={() => setIsMenuOpen(false)}
              >
                機能要望管理
              </Link>
            </div>
            <div className="space-y-1">
              <div className="px-3 py-2 font-semibold text-sm">
                アナリティクス
              </div>
              <Link
                activeClassName="bg-slate-700"
                className="block rounded-md px-6 py-2 hover:bg-slate-700"
                href="/analytics/search"
                onClick={() => setIsMenuOpen(false)}
                prefetch={true}
              >
                検索アナリティクス
              </Link>
              <Link
                activeClassName="bg-slate-700"
                className="block rounded-md px-6 py-2 hover:bg-slate-700"
                href="/analytics/click"
                onClick={() => setIsMenuOpen(false)}
                prefetch={true}
              >
                クリックアナリティクス
              </Link>
            </div>
            <div className="border-slate-700 border-t pt-2">
              <Link
                activeClassName="bg-slate-700"
                className="block rounded-md px-4 py-2 hover:bg-slate-700"
                href="/account"
                onClick={() => setIsMenuOpen(false)}
              >
                アカウント設定
              </Link>
              <Link
                activeClassName="bg-slate-700"
                className="block rounded-md px-4 py-2 hover:bg-slate-700"
                href="/system"
                onClick={() => setIsMenuOpen(false)}
              >
                システム
              </Link>
              <div className="my-2 border-slate-700 border-t" />
              <Form action={signOut}>
                <SubmitButton
                  className="w-full rounded-md bg-slate-500 px-4 py-2 text-slate-50 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 active:bg-slate-600 active:shadow-inner disabled:pointer-events-none disabled:bg-slate-400"
                  type="submit"
                >
                  ログアウト
                </SubmitButton>
              </Form>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
