'use client'

import Link from 'next/link'
import { useState } from 'react'
import { twMerge } from 'tailwind-merge'

/**
 * QuickAccessWidget - Displays navigation links for quick access
 * This component provides navigation shortcuts with mobile-responsive collapsible design
 */
export function QuickAccessWidget() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      {/* Header with mobile toggle button */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-xl">クイックアクセス</h2>
        <button
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          type="button"
        >
          <svg
            aria-hidden="true"
            className={`h-5 w-5 transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              d="M19 9l-7 7-7-7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="sr-only">
            {isMobileMenuOpen ? 'メニューを閉じる' : 'メニューを開く'}
          </span>
        </button>
      </div>

      {/* Navigation links - collapsible on mobile, always visible on desktop */}
      <div
        className={twMerge(
          'flex flex-col gap-3',
          isMobileMenuOpen ? 'flex' : 'hidden',
          'lg:flex',
        )}
      >
        <Link
          className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-center transition-colors hover:bg-gray-50"
          href="/videos"
        >
          <span className="font-medium">動画を管理する</span>
        </Link>
        <Link
          className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-center transition-colors hover:bg-gray-50"
          href="/channels"
        >
          <span className="font-medium">チャンネル管理</span>
        </Link>
        <Link
          className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-center transition-colors hover:bg-gray-50"
          href="/terms"
        >
          <span className="font-medium">用語集を編集する</span>
        </Link>
        <Link
          className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-center transition-colors hover:bg-gray-50"
          href="/recommended-queries"
        >
          <span className="font-medium">オススメクエリ管理</span>
        </Link>
        <Link
          className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-center transition-colors hover:bg-gray-50"
          href="/analytics/search"
        >
          <span className="font-medium">検索アナリティクス</span>
        </Link>
        <Link
          className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-center transition-colors hover:bg-gray-50"
          href="/analytics/click"
        >
          <span className="font-medium">クリックアナリティクス</span>
        </Link>
        <a
          className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-center transition-colors hover:bg-gray-50"
          href="https://shinju.date"
          rel="noopener noreferrer"
          target="_blank"
        >
          <span className="font-medium">公開サイトを確認する</span>
          <span className="ml-1 text-gray-500 text-sm">↗</span>
        </a>
      </div>
    </div>
  )
}
