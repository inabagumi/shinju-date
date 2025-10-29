'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ChannelModal } from './channel-modal'

type Channel = {
  id: number
  name: string
  slug: string
  created_at: string
  updated_at: string
}

type ChannelsListProps = {
  channels: Channel[]
}

export function ChannelsList({ channels }: ChannelsListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Filter channels based on search query
  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channels

    const query = searchQuery.toLowerCase()
    return channels.filter(
      (channel) =>
        channel.name.toLowerCase().includes(query) ||
        channel.slug.toLowerCase().includes(query),
    )
  }, [channels, searchQuery])

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
      {filteredChannels.length === 0 ? (
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
                <th className="px-4 py-3 text-left font-semibold">
                  チャンネルID
                </th>
                <th className="w-24 px-4 py-3 text-right font-semibold">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-774-blue-200 bg-white">
              {filteredChannels.map((channel) => (
                <tr className="hover:bg-774-blue-50" key={channel.id}>
                  <td className="px-4 py-3">
                    <Link
                      className="text-blue-600 hover:text-blue-800"
                      href={`/channels/${channel.slug}`}
                    >
                      {channel.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {channel.slug}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChannelModal channel={channel} />
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
