'use client'

import { useMemo, useState, useTransition } from 'react'
import { addQueryAction, deleteQueryAction } from '../_actions'

type QueriesListProps = {
  manualQueries: string[]
  autoQueries: Array<{ query: string; score: number }>
}

export function QueriesList({ manualQueries, autoQueries }: QueriesListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [newQuery, setNewQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Filter queries based on search query
  const filteredManualQueries = useMemo(() => {
    if (!searchQuery.trim()) return manualQueries

    const query = searchQuery.toLowerCase()
    return manualQueries.filter((q) => q.toLowerCase().includes(query))
  }, [manualQueries, searchQuery])

  const filteredAutoQueries = useMemo(() => {
    if (!searchQuery.trim()) return autoQueries

    const query = searchQuery.toLowerCase()
    return autoQueries.filter((item) =>
      item.query.toLowerCase().includes(query),
    )
  }, [autoQueries, searchQuery])

  const handleAddQuery = () => {
    setError(null)
    startTransition(async () => {
      const result = await addQueryAction(newQuery)
      if (result.success) {
        setNewQuery('')
      } else {
        setError(result.error ?? '追加に失敗しました。')
      }
    })
  }

  const handleDeleteQuery = (query: string) => {
    setError(null)
    startTransition(async () => {
      const result = await deleteQueryAction(query)
      if (!result.success) {
        setError(result.error ?? '削除に失敗しました。')
      }
    })
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header and Add Form */}
      <div className="space-y-4">
        <h1 className="font-bold text-2xl">オススメクエリ管理</h1>

        {/* Add Query Form */}
        <div className="flex flex-col gap-4 rounded-lg border border-774-blue-300 bg-774-blue-50 p-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              className="mb-2 block font-medium text-sm"
              htmlFor="new-query"
            >
              新しい手動クエリを追加
            </label>
            <input
              className="w-full rounded-md border border-774-blue-300 px-4 py-2 focus:border-secondary-blue focus:outline-none"
              disabled={isPending}
              id="new-query"
              onChange={(e) => setNewQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddQuery()
                }
              }}
              placeholder="クエリを入力..."
              type="text"
              value={newQuery}
            />
          </div>
          <button
            className="rounded-md bg-secondary-blue px-6 py-2 text-white hover:bg-secondary-blue/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-blue focus-visible:ring-offset-2 active:bg-secondary-blue/80 disabled:pointer-events-none disabled:opacity-50"
            disabled={isPending || !newQuery.trim()}
            onClick={handleAddQuery}
            type="button"
          >
            {isPending ? '追加中...' : '追加'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Search */}
        <input
          className="w-full rounded-md border border-774-blue-300 px-4 py-2 focus:border-secondary-blue focus:outline-none sm:max-w-md"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="クエリを検索..."
          type="text"
          value={searchQuery}
        />
      </div>

      {/* Manual Queries List */}
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">
          手動追加クエリ ({manualQueries.length}件)
        </h2>
        {filteredManualQueries.length === 0 ? (
          <p className="py-8 text-center text-gray-500">
            {searchQuery
              ? '検索結果がありません。'
              : '手動追加されたオススメクエリがありません。'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-774-blue-300">
            <table className="w-full">
              <thead className="bg-774-blue-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">クエリ</th>
                  <th className="w-24 px-4 py-3 text-right font-semibold">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-774-blue-200 bg-white">
                {filteredManualQueries.map((query) => (
                  <tr className="hover:bg-774-blue-50" key={query}>
                    <td className="px-4 py-3">{query}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="rounded-md bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 active:bg-red-700 disabled:pointer-events-none disabled:opacity-50"
                        disabled={isPending}
                        onClick={() => handleDeleteQuery(query)}
                        type="button"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Auto Queries List */}
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">
          自動選出クエリ ({autoQueries.length}件)
        </h2>
        <p className="text-gray-600 text-sm">
          検索トレンドに基づいて自動的に選出されたクエリです。スコアは時間減衰を考慮した重み付けスコアです。
        </p>
        {filteredAutoQueries.length === 0 ? (
          <p className="py-8 text-center text-gray-500">
            {searchQuery
              ? '検索結果がありません。'
              : '自動選出されたオススメクエリがありません。'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-774-blue-300">
            <table className="w-full">
              <thead className="bg-774-blue-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">クエリ</th>
                  <th className="w-32 px-4 py-3 text-right font-semibold">
                    スコア
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-774-blue-200 bg-white">
                {filteredAutoQueries.map(({ query, score }) => (
                  <tr className="hover:bg-774-blue-50" key={query}>
                    <td className="px-4 py-3">{query}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-600 text-sm">
                      {score.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
