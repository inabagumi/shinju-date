'use client'

import { formatDateTimeFromISO } from '@shinju-date/temporal-fns'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ChannelActions } from './channel-actions'
import { ChannelModal } from './channel-modal'

type Channel = {
  id: string
  name: string
  created_at: string
  updated_at: string
  youtube_channel: {
    name: string | null
    youtube_channel_id: string
  } | null
}

type ChannelsListProps = {
  channels: Channel[]
}

export function ChannelsList({ channels }: ChannelsListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Filter and sort channels
  const filteredAndSortedChannels = useMemo(() => {
    let filtered = channels

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = channels.filter((channel) =>
        channel.name.toLowerCase().includes(query),
      )
    }

    // Sort by updated_at
    return filtered.sort((a, b) => {
      const dateA = new Date(a.updated_at).getTime()
      const dateB = new Date(b.updated_at).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })
  }, [channels, searchQuery, sortOrder])

  const toggleSortOrder = () => {
    setSortOrder((current) => (current === 'desc' ? 'asc' : 'desc'))
  }

  return (
    <div className="space-y-6 p-4">
      {/* Search and Add button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-bold text-2xl">チャンネル管理</h1>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          className="w-full rounded-md border border-774-blue-300 px-4 py-2 focus:border-secondary-blue focus:outline-none sm:max-w-md"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="チャンネル名またはIDで検索..."
          type="text"
          value={searchQuery}
        />
        <ChannelModal />
      </div>

      {/* Channels table */}
      {filteredAndSortedChannels.length === 0 ? (
        <p className="py-8 text-center text-gray-500">
          {searchQuery ? '検索結果がありません。' : 'チャンネルがありません。'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-774-blue-300">
          <table className="w-full">
            <thead className="bg-774-blue-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">
                  チャンネル名
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
              {filteredAndSortedChannels.map((channel) => (
                <tr className="hover:bg-774-blue-50" key={channel.id}>
                  <td className="px-4 py-3">
                    <div>
                      <Link
                        className="text-blue-600 hover:text-blue-800"
                        href={`/channels/${channel.id}`}
                      >
                        {channel.name}
                      </Link>
                      {channel.youtube_channel?.name &&
                        channel.youtube_channel.name !== channel.name && (
                          <div className="text-gray-600 text-xs">
                            YouTube: {channel.youtube_channel.name}
                          </div>
                        )}
                      <div className="font-mono text-gray-500 text-xs">
                        {channel.youtube_channel?.youtube_channel_id ||
                          channel.id}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">
                    {formatDateTimeFromISO(channel.created_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">
                    {formatDateTimeFromISO(channel.updated_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChannelActions channel={channel} />
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
