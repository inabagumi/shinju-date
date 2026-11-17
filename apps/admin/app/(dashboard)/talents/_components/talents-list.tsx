'use client'

import type { Tables } from '@shinju-date/database'
import { formatDateTimeFromISO } from '@shinju-date/temporal-fns'
import {
  EmptyState,
  FilterBar,
  Input,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shinju-date/ui'
import { ArrowDown, ArrowUp, Users } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { FilterBarSkeleton, TableSkeleton } from '@/components/table-skeleton'
import { TalentActions } from './talent-actions'
import { TalentModal } from './talent-modal'
import { TalentStatusBadge } from './talent-status-badge'

type Talent = Pick<
  Tables<'talents'>,
  'id' | 'name' | 'created_at' | 'updated_at' | 'deleted_at' | 'status'
> & {
  youtube_channels?: Pick<
    Tables<'youtube_channels'>,
    'id' | 'name' | 'youtube_channel_id' | 'youtube_handle'
  >[]
}

type StatusFilter = 'not_deleted' | 'active' | 'retired' | 'deleted' | 'all'

interface TalentsListProps {
  talents: Talent[]
}

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { label: '削除済み以外', value: 'not_deleted' },
  { label: 'アクティブ', value: 'active' },
  { label: '引退', value: 'retired' },
  { label: '削除済み', value: 'deleted' },
  { label: 'すべて', value: 'all' },
]

function matchesFilter(talent: Talent, filter: StatusFilter): boolean {
  const isDeleted = talent.deleted_at !== null

  switch (filter) {
    case 'all':
      return true
    case 'deleted':
      return isDeleted
    case 'active':
      return !isDeleted && talent.status === 'active'
    case 'retired':
      return !isDeleted && talent.status === 'retired'
    case 'not_deleted':
      return !isDeleted
  }
}

export function TalentsList({ talents }: TalentsListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('not_deleted')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const filteredAndSortedTalents = useMemo(() => {
    let filtered = talents.filter((talent) =>
      matchesFilter(talent, statusFilter),
    )

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (talent) =>
          talent.name.toLowerCase().includes(query) ||
          talent.id.toLowerCase().includes(query),
      )
    }

    return filtered.sort((a, b) => {
      const order = Temporal.Instant.compare(
        Temporal.Instant.from(a.updated_at),
        Temporal.Instant.from(b.updated_at),
      )
      return sortOrder === 'desc' ? -order : order
    })
  }, [talents, searchQuery, sortOrder, statusFilter])

  const toggleSortOrder = () => {
    setSortOrder((current) => (current === 'desc' ? 'asc' : 'desc'))
  }

  const isFiltered = searchQuery.trim() !== '' || statusFilter !== 'not_deleted'
  const activeFilterCount =
    (searchQuery.trim() !== '' ? 1 : 0) +
    (statusFilter !== 'not_deleted' ? 1 : 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <FilterBar activeCount={activeFilterCount} className="min-w-0 grow">
          <Input
            aria-label="タレント名またはIDで検索"
            className="md:max-w-sm"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="タレント名またはIDで検索..."
            type="search"
            value={searchQuery}
          />
          <Select
            aria-label="状態で絞り込み"
            className="md:w-48"
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            value={statusFilter}
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FilterBar>
        <TalentModal />
      </div>

      {filteredAndSortedTalents.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title={isFiltered ? '検索結果がありません。' : 'タレントがいません。'}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>タレント名</TableHead>
              <TableHead>状態</TableHead>
              <TableHead>作成日時</TableHead>
              <TableHead
                aria-sort={sortOrder === 'desc' ? 'descending' : 'ascending'}
              >
                <button
                  className="inline-flex items-center gap-1 rounded-control hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  onClick={toggleSortOrder}
                  type="button"
                >
                  最終更新日時
                  {sortOrder === 'desc' ? (
                    <ArrowDown aria-hidden="true" className="size-3" />
                  ) : (
                    <ArrowUp aria-hidden="true" className="size-3" />
                  )}
                </button>
              </TableHead>
              <TableHead className="text-right">
                <span className="sr-only">操作</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedTalents.map((talent) => (
              <TableRow key={talent.id}>
                <TableCell className="min-w-48 whitespace-normal">
                  <Link
                    className="font-semibold text-accent hover:underline"
                    href={`/talents/${talent.id}`}
                  >
                    {talent.name}
                  </Link>
                  {talent.youtube_channels &&
                    talent.youtube_channels.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {talent.youtube_channels.map((channel) => (
                          <div key={channel.id}>
                            {channel.name && channel.name !== talent.name && (
                              <div className="text-caption text-muted">
                                YouTube: {channel.name}
                              </div>
                            )}
                            <div className="font-mono text-caption break-all text-muted">
                              {channel.youtube_channel_id}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  {(!talent.youtube_channels ||
                    talent.youtube_channels.length === 0) && (
                    <div className="font-mono text-caption break-all text-muted">
                      {talent.id}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <TalentStatusBadge talent={talent} />
                </TableCell>
                <TableCell className="text-muted tabular-nums">
                  <time dateTime={talent.created_at}>
                    {formatDateTimeFromISO(talent.created_at)}
                  </time>
                </TableCell>
                <TableCell className="text-muted tabular-nums">
                  <time dateTime={talent.updated_at}>
                    {formatDateTimeFromISO(talent.updated_at)}
                  </time>
                </TableCell>
                <TableCell className="w-12 text-right">
                  <TalentActions talent={talent} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

/** 読み込み中の `TalentsList`。絞り込みと追加のボタン、5列の表を並べる */
export function TalentsListSkeleton() {
  return (
    <TableSkeleton
      columns={[
        {
          cell: (
            <div className="min-w-48 space-y-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          ),
          id: 'name',
        },
        { cell: <Skeleton className="h-5 w-16" />, id: 'status' },
        { cell: <Skeleton className="h-4 w-36" />, id: 'created_at' },
        { cell: <Skeleton className="h-4 w-36" />, id: 'updated_at' },
        {
          align: 'end',
          cell: <Skeleton className="size-7" />,
          className: 'w-12',
          header: false,
          id: 'actions',
        },
      ]}
      filterBar={
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <FilterBarSkeleton className="min-w-0 grow">
            <Skeleton className="h-10 w-full md:max-w-sm" />
            <Skeleton className="h-10 md:w-48" />
          </FilterBarSkeleton>
          <Skeleton className="h-9 w-44" />
        </div>
      }
    />
  )
}
