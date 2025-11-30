import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <h1 className="mb-2 font-bold text-6xl text-gray-900">404</h1>
          <h2 className="mb-4 font-semibold text-2xl text-gray-700">
            ページが見つかりません
          </h2>
          <p className="text-gray-600">
            お探しのページは存在しないか、削除された可能性があります。
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-secondary-blue px-6 py-3 font-medium text-sm text-white shadow-sm hover:bg-774-blue-800 focus:outline-none focus:ring-2 focus:ring-774-blue-500 focus:ring-offset-2"
            href="/"
          >
            ダッシュボードに戻る
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 text-sm shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-774-blue-500 focus:ring-offset-2"
            href="/videos"
          >
            動画一覧を見る
          </Link>
        </div>
      </div>
    </div>
  )
}
