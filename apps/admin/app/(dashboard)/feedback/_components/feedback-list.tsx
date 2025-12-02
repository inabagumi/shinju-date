'use client'

import { TIME_ZONE } from '@shinju-date/constants'
import type { Tables } from '@shinju-date/database'
import { formatDateKey } from '@shinju-date/temporal-fns'
import { Badge } from '@shinju-date/ui'
import Link from 'next/link'
import { useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { Temporal } from 'temporal-polyfill'

interface FeatureRequestListProps {
  featureRequests: Tables<'feature_requests'>[]
}

const statusLabels: Record<Tables<'feature_requests'>['status'], string> = {
  in_progress: '対応中',
  pending: '未対応',
  rejected: '却下',
  resolved: '対応済み',
}

const statusColors: Record<
  Tables<'feature_requests'>['status'],
  'info' | 'secondary' | 'success' | 'error'
> = {
  in_progress: 'secondary',
  pending: 'info',
  rejected: 'error',
  resolved: 'success',
}

export function FeatureRequestList({
  featureRequests,
}: FeatureRequestListProps) {
  const [statusFilter, setStatusFilter] = useState<
    Tables<'feature_requests'>['status'] | 'all'
  >('all')
  const [readFilter, setReadFilter] = useState<'all' | 'read' | 'unread'>('all')

  const filteredRequests = featureRequests.filter((item) => {
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
                e.target.value as Tables<'feature_requests'>['status'] | 'all',
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

      {/* Feature Request List */}
      {filteredRequests.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
          機能要望がありません
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRequests.map((item) => {
            const createdAt = Temporal.Instant.from(item.created_at)
            const formattedDate = formatDateKey(
              createdAt.toZonedDateTimeISO(TIME_ZONE),
            )

            return (
              <Link
                className={twMerge(
                  'block rounded-lg border p-4 transition hover:shadow-md',
                  item.is_read
                    ? 'border-gray-200 bg-white'
                    : 'border-blue-200 bg-blue-50',
                )}
                href={`/feedback/${item.id}`}
                key={item.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusColors[item.status]}>
                        {statusLabels[item.status]}
                      </Badge>
                      {!item.is_read && <Badge variant="warning">未読</Badge>}
                    </div>
                    <p className="line-clamp-2 text-gray-700">{item.message}</p>
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
