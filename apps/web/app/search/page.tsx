import type { Metadata } from 'next'
import Link from 'next/link'

type SearchParams = Promise<{ q?: string }>

export const metadata: Metadata = {
  title: '検索',
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const query = params.q

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link
            className="text-774-nevy-500 hover:text-774-nevy-700 dark:text-774-nevy-300"
            href="/"
          >
            ← ホームに戻る
          </Link>
        </div>

        <h1 className="mb-8 font-bold text-2xl">検索結果</h1>

        {query ? (
          <>
            <div className="mb-8">
              <p className="text-774-nevy-600 dark:text-774-nevy-400">
                検索キーワード: <strong>{query}</strong>
              </p>
            </div>

            <div className="rounded-lg border border-774-nevy-200 bg-774-nevy-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-800">
              <p className="text-774-nevy-600 dark:text-774-nevy-400">
                検索機能は実装中です
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-774-nevy-200 bg-774-nevy-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-800">
            <p className="text-774-nevy-600 dark:text-774-nevy-400">
              検索キーワードを入力してください
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
