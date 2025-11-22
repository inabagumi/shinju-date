'use client'

import { formatDateTimeFromISO } from '@shinju-date/temporal-fns'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { TalentActions } from './talent-actions'
import { TalentModal } from './talent-modal'

type Talent = {
  id: string
  name: string
  created_at: string
  updated_at: string
  youtube_channels: Array<{
    id: string
    name: string | null
    youtube_channel_id: string
    youtube_handle: string | null
  }>
}

type TalentsListProps = {
  talents: Talent[]
}

export function TalentsList({ talents }: TalentsListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Filter and sort talents
  const filteredAndSortedTalents = useMemo(() => {
    let filtered = talents

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = talents.filter((talent) =>
        talent.name.toLowerCase().includes(query),
      )
    }

    // Sort by updated_at
    return filtered.sort((a, b) => {
      const dateA = new Date(a.updated_at).getTime()
      const dateB = new Date(b.updated_at).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })
  }, [talents, searchQuery, sortOrder])

  const toggleSortOrder = () => {
    setSortOrder((current) => (current === 'desc' ? 'asc' : 'desc'))
  }

  return (
    <div className="space-y-6 p-4">
      {/* Search and Add button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-bold text-2xl">タレント管理</h1>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          className="w-full rounded-md border border-774-blue-300 px-4 py-2 focus:border-secondary-blue focus:outline-none sm:max-w-md"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="タレント名またはIDで検索..."
          type="text"
          value={searchQuery}
        />
        <TalentModal />
      </div>

      {/* Talents table */}
      {filteredAndSortedTalents.length === 0 ? (
        <p className="py-8 text-center text-gray-500">
          {searchQuery ? '検索結果がありません。' : 'タレントがいません。'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-774-blue-300">
          <table className="w-full">
            <thead className="bg-774-blue-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">
                  タレント名
                </th>
                <th className="px-4 py-3 text-left font-semibold">作成日時</th>
                <th className="px-4 py-3 text-left font-semibold">
                  <button
                    className="flex items-center gap-1 hover:text-blue-600"
                    onClick={toggleSortOrder}
                    type="button"
                  >
                    最終更新日時
                    <span className="text-xs">
                      {sortOrder === 'desc' ? '↓' : '↑'}
                    </span>
                  </button>
                </th>
                <th className="w-24 px-4 py-3 text-right font-semibold">
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
                        className="text-blue-600 hover:text-blue-800"
                        href={`/talents/${talent.id}`}
                      >
                        {talent.name}
                      </Link>
                      {talent.youtube_channels.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {talent.youtube_channels.map((channel) => (
                            <div key={channel.id}>
                              {channel.name && channel.name !== talent.name && (
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
                      {talent.youtube_channels.length === 0 && (
                        <div className="font-mono text-gray-500 text-xs">
                          {talent.id}
                        </div>
                      )}
                    </div>
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
