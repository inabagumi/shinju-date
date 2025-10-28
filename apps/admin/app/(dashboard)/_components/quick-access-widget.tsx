import Link from 'next/link'

/**
 * QuickAccessWidget - Displays navigation links for quick access
 * This is a static component that provides navigation shortcuts
 */
export function QuickAccessWidget() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 font-semibold text-xl">クイックアクセス</h2>
      <div className="flex flex-col gap-3">
        <Link
          className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-center transition-colors hover:bg-gray-50"
          href="/videos"
        >
          <span className="font-medium">動画を管理する</span>
        </Link>
        <Link
          className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-center transition-colors hover:bg-gray-50"
          href="/terms"
        >
          <span className="font-medium">用語集を編集する</span>
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
