'use client'

import type { Tables } from '@shinju-date/database/default'
import { formatDateKey } from '@shinju-date/temporal-fns'
import { Badge } from '@shinju-date/ui'
import Link from 'next/link'
import { useState } from 'react'
import { Temporal } from 'temporal-polyfill'

interface FeedbackListProps {
  feedback: Tables<'feedback'>[]
}

const statusLabels: Record<Tables<'feedback'>['status'], string> = {
  in_progress: '対応中',
  pending: '未対応',
  rejected: '却下',
  resolved: '対応済み',
}

const typeLabels: Record<string, string> = {
  bug: '不具合報告',
  feature: '機能要望',
  other: 'その他',
}

const statusColors: Record<
  Tables<'feedback'>['status'],
  'default' | 'secondary' | 'success' | 'destructive'
> = {
  in_progress: 'secondary',
  pending: 'default',
  rejected: 'destructive',
  resolved: 'success',
}

export function FeedbackList({ feedback }: FeedbackListProps) {
  const [statusFilter, setStatusFilter] = useState<
    Tables<'feedback'>['status'] | 'all'
  >('all')
  const [readFilter, setReadFilter] = useState<'all' | 'read' | 'unread'>('all')

  const filteredFeedback = feedback.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false
    if (readFilter === 'read' && !item.is_read) return false
    if (readFilter === 'unread' && item.is_read) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="mr-2 text-sm font-medium" htmlFor="status-filter">
            ステータス:
          </label>
          <select
            className="rounded-md border border-gray-300 px-3 py-2"
            id="status-filter"
            onChange={(e) =>
              setStatusFilter(
                e.target.value as Tables<'feedback'>['status'] | 'all',
              )
            }
            value={statusFilter}
          >
            <option value="all">すべて</option>
            <option value="pending">未対応</option>
            <option value="in_progress">対応中</option>
            <option value="resolved">対応済み</option>
            <option value="rejected">却下</option>
          </select>
        </div>
        <div>
          <label className="mr-2 text-sm font-medium" htmlFor="read-filter">
            既読状態:
          </label>
          <select
            className="rounded-md border border-gray-300 px-3 py-2"
            id="read-filter"
            onChange={(e) =>
              setReadFilter(e.target.value as 'all' | 'read' | 'unread')
            }
            value={readFilter}
          >
            <option value="all">すべて</option>
            <option value="unread">未読</option>
            <option value="read">既読</option>
          </select>
        </div>
      </div>

      {/* Feedback List */}
      {filteredFeedback.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
          フィードバックがありません
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFeedback.map((item) => {
            const createdAt = Temporal.Instant.from(item.created_at)
            const formattedDate = formatDateKey(
              createdAt.toZonedDateTimeISO('Asia/Tokyo'),
            )

            return (
              <Link
                className={`block rounded-lg border p-4 transition hover:shadow-md ${
                  item.is_read
                    ? 'border-gray-200 bg-white'
                    : 'border-blue-200 bg-blue-50'
                }`}
                href={`/feedback/${item.id}`}
                key={item.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusColors[item.status]}>
                        {statusLabels[item.status]}
                      </Badge>
                      <Badge variant="outline">
                        {typeLabels[item.type] || item.type}
                      </Badge>
                      {!item.is_read && <Badge variant="secondary">未読</Badge>}
                      {item.wants_reply && (
                        <Badge variant="outline">返信希望</Badge>
                      )}
                    </div>
                    <p className="line-clamp-2 text-gray-700">{item.message}</p>
                    {item.name && (
                      <p className="text-gray-600 text-sm">
                        送信者: {item.name}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-gray-500 text-sm">
                    {formattedDate.slice(0, 4)}-{formattedDate.slice(4, 6)}-
                    {formattedDate.slice(6, 8)}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
