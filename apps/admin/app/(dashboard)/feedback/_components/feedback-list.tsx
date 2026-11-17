'use client'

import { TIME_ZONE } from '@shinju-date/constants'
import type { Tables } from '@shinju-date/database'
import { range } from '@shinju-date/helpers'
import { formatDateTime } from '@shinju-date/temporal-fns'
import {
  Badge,
  EmptyState,
  FilterBar,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shinju-date/ui'
import { Inbox } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import {
  FEATURE_REQUEST_STATUS_LABELS,
  FEATURE_REQUEST_STATUSES,
  type FeatureRequestStatus,
} from '../_lib/feature-request-status'

interface FeatureRequestListProps {
  featureRequests: Tables<'feature_requests'>[]
}

const statusColors: Record<
  FeatureRequestStatus,
  'info' | 'neutral' | 'success' | 'danger'
> = {
  in_progress: 'neutral',
  pending: 'info',
  rejected: 'danger',
  resolved: 'success',
}

export function FeatureRequestList({
  featureRequests,
}: FeatureRequestListProps) {
  const [statusFilter, setStatusFilter] = useState<
    FeatureRequestStatus | 'all'
  >('all')
  const [readFilter, setReadFilter] = useState<'all' | 'read' | 'unread'>('all')

  const filteredRequests = featureRequests.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false
    if (readFilter === 'read' && !item.is_read) return false
    if (readFilter === 'unread' && item.is_read) return false
    return true
  })

  const activeCount =
    (statusFilter === 'all' ? 0 : 1) + (readFilter === 'all' ? 0 : 1)

  return (
    <div className="space-y-4">
      <FilterBar activeCount={activeCount}>
        <div className="flex flex-col gap-1 md:w-48">
          <label className="text-meta font-semibold" htmlFor="status-filter">
            ステータス
          </label>
          <Select
            id="status-filter"
            onChange={(e) =>
              setStatusFilter(e.target.value as FeatureRequestStatus | 'all')
            }
            value={statusFilter}
          >
            <option value="all">すべて</option>
            {FEATURE_REQUEST_STATUSES.map((status) => (
              <option key={status} value={status}>
                {FEATURE_REQUEST_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1 md:w-48">
          <label className="text-meta font-semibold" htmlFor="read-filter">
            既読状態
          </label>
          <Select
            id="read-filter"
            onChange={(e) =>
              setReadFilter(e.target.value as 'all' | 'read' | 'unread')
            }
            value={readFilter}
          >
            <option value="all">すべて</option>
            <option value="unread">未読</option>
            <option value="read">既読</option>
          </Select>
        </div>
      </FilterBar>

      {filteredRequests.length === 0 ? (
        <EmptyState
          className="rounded-container border border-border bg-surface"
          icon={<Inbox />}
          title="機能要望がありません"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>状態</TableHead>
              <TableHead>内容</TableHead>
              <TableHead className="text-right">送信日時</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.map((item) => {
              const createdAt = Temporal.Instant.from(item.created_at)
              const formattedDate = formatDateTime(
                createdAt.toZonedDateTimeISO(TIME_ZONE),
              )

              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusColors[item.status]}>
                        {FEATURE_REQUEST_STATUS_LABELS[item.status]}
                      </Badge>
                      {!item.is_read && <Badge variant="warning">未読</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-64 whitespace-normal">
                    <Link
                      className={`line-clamp-2 max-w-text rounded-control hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                        item.is_read ? '' : 'font-semibold'
                      }`}
                      href={`/feedback/${item.id}`}
                    >
                      {item.message}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right text-muted tabular-nums">
                    {formattedDate}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

export function FeatureRequestListSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="h-16 w-48 rounded-control bg-muted" />
        <div className="h-16 w-48 rounded-control bg-muted" />
      </div>
      <div className="overflow-hidden rounded-container border border-border">
        <div className="h-10 bg-muted" />
        {range(5).map((row) => (
          <div
            className="flex h-16 items-center gap-4 border-t border-border px-4"
            key={`feature-request-row-skeleton-${row}`}
          >
            <div className="h-5 w-16 rounded-control bg-muted" />
            <div className="h-4 flex-1 rounded-control bg-muted" />
            <div className="h-4 w-32 rounded-control bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
