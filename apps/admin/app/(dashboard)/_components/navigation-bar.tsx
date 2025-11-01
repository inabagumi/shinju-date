'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import Form, { Button } from '@/components/form'
import { signOut } from '../_lib/actions'

export function NavigationBar() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false)
  const [isAnalyticsMenuOpen, setIsAnalyticsMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const isActive = (path: string) => pathname === path

  return (
    <nav className="sticky top-0 z-50 bg-slate-800 text-slate-50">
      {/* Desktop Navigation */}
      <div className="hidden items-center gap-4 p-2 md:flex">
        <Link className="inline-block p-2 font-semibold text-xl" href="/">
          Admin UI
        </Link>
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
                  className={`block px-4 py-2 hover:bg-slate-600 ${
                    isActive('/videos') ? 'bg-slate-600' : ''
                  }`}
                  href="/videos"
                  onClick={() => setIsDataMenuOpen(false)}
                >
                  動画管理
                </Link>
                <Link
                  className={`block px-4 py-2 hover:bg-slate-600 ${
                    isActive('/channels') ? 'bg-slate-600' : ''
                  }`}
                  href="/channels"
                  onClick={() => setIsDataMenuOpen(false)}
                >
                  チャンネル管理
                </Link>
                <Link
                  className={`block px-4 py-2 hover:bg-slate-600 ${
                    isActive('/terms') ? 'bg-slate-600' : ''
                  }`}
                  href="/terms"
                  onClick={() => setIsDataMenuOpen(false)}
                >
                  用語管理
                </Link>
                <Link
                  className={`block px-4 py-2 hover:bg-slate-600 ${
                    isActive('/recommended-queries') ? 'bg-slate-600' : ''
                  }`}
                  href="/recommended-queries"
                  onClick={() => setIsDataMenuOpen(false)}
                >
                  オススメクエリ管理
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
                  className={`block px-4 py-2 hover:bg-slate-600 ${
                    isActive('/analytics/search') ? 'bg-slate-600' : ''
                  }`}
                  href="/analytics/search"
                  onClick={() => setIsAnalyticsMenuOpen(false)}
                >
                  検索アナリティクス
                </Link>
                <Link
                  className={`block px-4 py-2 hover:bg-slate-600 ${
                    isActive('/analytics/click') ? 'bg-slate-600' : ''
                  }`}
                  href="/analytics/click"
                  onClick={() => setIsAnalyticsMenuOpen(false)}
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
              <svg
                aria-hidden="true"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </button>
            {isUserMenuOpen && (
              <div
                className="absolute top-full right-0 z-50 mt-1 min-w-[200px] rounded-md border border-slate-600 bg-slate-700 py-1 shadow-lg"
                onMouseLeave={() => setIsUserMenuOpen(false)}
                role="menu"
              >
                <Link
                  className={`block px-4 py-2 hover:bg-slate-600 ${
                    isActive('/account') ? 'bg-slate-600' : ''
                  }`}
                  href="/account"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  アカウント設定
                </Link>
                <div className="my-1 border-slate-600 border-t" />
                <Form action={signOut}>
                  <Button
                    className="w-full px-4 py-2 text-left hover:bg-slate-600 focus-visible:bg-slate-600 focus-visible:outline-none"
                    type="submit"
                  >
                    ログアウト
                  </Button>
                </Form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="flex items-center justify-between p-2 md:hidden">
        <Link className="inline-block p-2 font-semibold text-xl" href="/">
          Admin UI
        </Link>
        <button
          aria-label="メニューを開く"
          className="rounded-md p-2 hover:bg-slate-700"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isMenuOpen ? (
              <path
                d="M6 18L18 6M6 6l12 12"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            ) : (
              <path
                d="M4 6h16M4 12h16M4 18h16"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="border-slate-700 border-t md:hidden">
          <div className="space-y-1 p-2">
            <div className="space-y-1">
              <div className="px-3 py-2 font-semibold text-sm">データ管理</div>
              <Link
                className={`block rounded-md px-6 py-2 hover:bg-slate-700 ${
                  isActive('/videos') ? 'bg-slate-700' : ''
                }`}
                href="/videos"
                onClick={() => setIsMenuOpen(false)}
              >
                動画管理
              </Link>
              <Link
                className={`block rounded-md px-6 py-2 hover:bg-slate-700 ${
                  isActive('/channels') ? 'bg-slate-700' : ''
                }`}
                href="/channels"
                onClick={() => setIsMenuOpen(false)}
              >
                チャンネル管理
              </Link>
              <Link
                className={`block rounded-md px-6 py-2 hover:bg-slate-700 ${
                  isActive('/terms') ? 'bg-slate-700' : ''
                }`}
                href="/terms"
                onClick={() => setIsMenuOpen(false)}
              >
                用語管理
              </Link>
              <Link
                className={`block rounded-md px-6 py-2 hover:bg-slate-700 ${
                  isActive('/recommended-queries') ? 'bg-slate-700' : ''
                }`}
                href="/recommended-queries"
                onClick={() => setIsMenuOpen(false)}
              >
                オススメクエリ管理
              </Link>
            </div>
            <div className="space-y-1">
              <div className="px-3 py-2 font-semibold text-sm">
                アナリティクス
              </div>
              <Link
                className={`block rounded-md px-6 py-2 hover:bg-slate-700 ${
                  isActive('/analytics/search') ? 'bg-slate-700' : ''
                }`}
                href="/analytics/search"
                onClick={() => setIsMenuOpen(false)}
              >
                検索アナリティクス
              </Link>
              <Link
                className={`block rounded-md px-6 py-2 hover:bg-slate-700 ${
                  isActive('/analytics/click') ? 'bg-slate-700' : ''
                }`}
                href="/analytics/click"
                onClick={() => setIsMenuOpen(false)}
              >
                クリックアナリティクス
              </Link>
            </div>
            <div className="border-slate-700 border-t pt-2">
              <Link
                className={`block rounded-md px-4 py-2 hover:bg-slate-700 ${
                  isActive('/account') ? 'bg-slate-700' : ''
                }`}
                href="/account"
                onClick={() => setIsMenuOpen(false)}
              >
                アカウント設定
              </Link>
              <Form action={signOut}>
                <Button
                  className="w-full rounded-md bg-slate-500 px-4 py-2 text-slate-50 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 active:bg-slate-600 active:shadow-inner disabled:pointer-events-none disabled:bg-slate-400"
                  type="submit"
                >
                  ログアウト
                </Button>
              </Form>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
