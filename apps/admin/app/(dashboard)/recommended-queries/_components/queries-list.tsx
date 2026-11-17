'use client'

import {
  Button,
  EmptyState,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shinju-date/ui'
import { useMemo, useState } from 'react'
import { useActionToast } from '@/components/action-toast'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { SearchInput } from '@/components/search-input'
import { useServerAction } from '@/lib/use-server-action'
import { addQueryAction, deleteQueryAction } from '../_actions'

interface QueriesListProps {
  manualQueries: string[]
  autoQueries: Array<{ query: string; score: number }>
  /** URL の `search`。前後の空白を取り除いたもの */
  search: string | undefined
}

export function QueriesList({
  manualQueries,
  autoQueries,
  search,
}: QueriesListProps) {
  const searchQuery = search ?? ''
  const [newQuery, setNewQuery] = useState('')
  const addQuery = useServerAction(addQueryAction, {
    errorText: '追加に失敗しました。',
    onSuccess: () => setNewQuery(''),
    successText: 'クエリを追加しました。',
  })
  const { showToast } = useActionToast()
  const isPending = addQuery.isPending

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
    void addQuery.run(newQuery)
  }

  // 失敗はダイアログの中に出し、成功したらダイアログを閉じてトーストで知らせる
  const handleDeleteQuery = async (query: string) => {
    const result = await deleteQueryAction(query)

    if (result.success) {
      showToast('success', 'クエリを削除しました。')
    }

    return result
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        {/* Add Query Form */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 sm:max-w-md">
            <label
              className="mb-2 block text-meta font-semibold"
              htmlFor="new-query"
            >
              新しい手動クエリを追加
            </label>
            <Input
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
          <Button
            disabled={isPending || !newQuery.trim()}
            onClick={handleAddQuery}
            type="button"
          >
            {addQuery.isPending ? '追加中...' : '追加'}
          </Button>
        </div>

        {/* Search */}
        <SearchInput
          aria-label="クエリを検索"
          className="sm:max-w-md"
          placeholder="クエリを検索..."
        />
      </div>

      {/* Manual Queries List */}
      <section className="space-y-3">
        <h2 className="text-heading font-bold">
          手動追加クエリ
          <span className="ml-2 text-meta font-normal text-muted tabular-nums">
            {manualQueries.length}件
          </span>
        </h2>
        {filteredManualQueries.length === 0 ? (
          <EmptyState
            className="rounded-container border border-border bg-surface"
            title={
              searchQuery
                ? '検索結果がありません。'
                : '手動追加されたおすすめクエリがありません。'
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>クエリ</TableHead>
                <TableHead className="w-24 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredManualQueries.map((query) => (
                <TableRow key={query}>
                  <TableCell className="whitespace-normal">{query}</TableCell>
                  <TableCell className="text-right">
                    <ConfirmDialog
                      confirmLabel="削除"
                      confirmVariant="danger"
                      description={`「${query}」を削除しますか？`}
                      onConfirm={() => handleDeleteQuery(query)}
                      title="おすすめクエリを削除"
                      trigger={
                        <Button
                          aria-label={`「${query}」を削除`}
                          disabled={isPending}
                          size="sm"
                          type="button"
                          variant="danger"
                        >
                          削除
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {/* Auto Queries List */}
      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-heading font-bold">
            自動選出クエリ
            <span className="ml-2 text-meta font-normal text-muted tabular-nums">
              {autoQueries.length}件
            </span>
          </h2>
          <p className="max-w-text text-meta text-muted">
            検索トレンドに基づいて自動的に選出されたクエリです。スコアは時間減衰を考慮した重み付けスコアです。
          </p>
        </div>
        {filteredAutoQueries.length === 0 ? (
          <EmptyState
            className="rounded-container border border-border bg-surface"
            title={
              searchQuery
                ? '検索結果がありません。'
                : '自動選出されたおすすめクエリがありません。'
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>クエリ</TableHead>
                <TableHead className="w-32 text-right">スコア</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAutoQueries.map(({ query, score }) => (
                <TableRow key={query}>
                  <TableCell className="whitespace-normal">{query}</TableCell>
                  <TableCell className="text-right text-muted tabular-nums">
                    {score.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}
