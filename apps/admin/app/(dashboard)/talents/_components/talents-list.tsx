'use client'

import type { Tables } from '@shinju-date/database'
import { formatDateTimeFromISO } from '@shinju-date/temporal-fns'
import Link from 'next/link'
import { useMemo, useState } from 'react'
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
      filtered = filtered.filter((talent) =>
        talent.name.toLowerCase().includes(query),
      )
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.updated_at).getTime()
      const dateB = new Date(b.updated_at).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })
  }, [talents, searchQuery, sortOrder, statusFilter])

  const toggleSortOrder = () => {
    setSortOrder((current) => (current === 'desc' ? 'asc' : 'desc'))
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-bold text-2xl">タレント管理</h1>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-3 sm:max-w-2xl sm:flex-row">
          <input
            className="w-full rounded-md border border-774-blue-300 px-4 py-2 focus:border-secondary-blue focus:outline-none"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="タレント名またはIDで検索..."
            type="text"
            value={searchQuery}
          />
          <select
            className="rounded-md border border-774-blue-300 px-3 py-2 focus:border-secondary-blue focus:outline-none sm:w-48"
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            value={statusFilter}
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <TalentModal />
      </div>

      {filteredAndSortedTalents.length === 0 ? (
        <p className="py-8 text-center text-gray-500">
          {searchQuery || statusFilter !== 'not_deleted'
            ? '検索結果がありません。'
            : 'タレントがいません。'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-774-blue-300">
          <table className="w-full">
            <thead className="bg-774-blue-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">
                  タレント名
                </th>
                <th className="px-4 py-3 text-left font-semibold">状態</th>
                <th className="px-4 py-3 text-left font-semibold">作成日時</th>
                <th className="px-4 py-3 text-left font-semibold">
                  <button
                    className="flex items-center gap-1 hover:text-774-blue-600"
                    onClick={toggleSortOrder}
                    type="button"
                  >
                    最終更新日時
                    <span className="text-xs">
                      {sortOrder === 'desc' ? '↓' : '↑'}
                    </span>
                  </button>
                </th>
                <th className="w-40 px-4 py-3 text-right font-semibold">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-774-blue-200 bg-white">
              {filteredAndSortedTalents.map((talent) => (
                <tr className="hover:bg-774-blue-50" key={talent.id}>
                  <td className="px-4 py-3">
                    <div>
                      <Link
                        className="text-774-blue-600 hover:text-774-blue-800"
                        href={`/talents/${talent.id}`}
                      >
                        {talent.name}
                      </Link>
                      {talent.youtube_channels &&
                        talent.youtube_channels.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {talent.youtube_channels.map((channel) => (
                              <div key={channel.id}>
                                {channel.name &&
                                  channel.name !== talent.name && (
                                    <div className="text-gray-600 text-xs">
                                      YouTube: {channel.name}
                                    </div>
                                  )}
                                <div className="font-mono text-gray-500 text-xs">
                                  {channel.youtube_channel_id}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      {(!talent.youtube_channels ||
                        talent.youtube_channels.length === 0) && (
                        <div className="font-mono text-gray-500 text-xs">
                          {talent.id}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TalentStatusBadge talent={talent} />
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">
                    <time dateTime={talent.created_at}>
                      {formatDateTimeFromISO(talent.created_at)}
                    </time>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">
                    <time dateTime={talent.updated_at}>
                      {formatDateTimeFromISO(talent.updated_at)}
                    </time>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <TalentActions talent={talent} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
