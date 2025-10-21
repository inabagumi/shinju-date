'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'

type Channel = {
  created_at: string
  id: number
  name: string
  slug: string
  updated_at: string
}

type Props = {
  channels: Channel[]
}

export function VideoFilters({ channels }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchInput, setSearchInput] = useState(
    searchParams.get('search') || '',
  )

  const currentChannelId = searchParams.get('channelId') || ''
  const currentDeleted = searchParams.get('deleted') || ''
  const currentVisible = searchParams.get('visible') || ''

  // Custom select styling
  const selectClasses = twMerge(
    'appearance-none',
    'rounded-md border border-gray-300 bg-white px-3 py-2',
    'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500',
    "bg-[url(\"data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2016%2016'%3e%3cpath%20fill='none'%20stroke='%23333'%20stroke-linecap='round'%20stroke-linejoin='round'%20stroke-width='2'%20d='m2%205%206%206%206-6'/%3e%3c/svg%3e\")]",
    'bg-[length:1em] bg-right-[0.5rem] bg-no-repeat',
    'pr-8',
  )

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (searchInput === '') {
        params.delete('search')
      } else {
        params.set('search', searchInput)
      }
      // Reset to page 1 when search changes
      params.delete('page')
      router.push(`/videos?${params.toString()}`)
    }, 500) // 500ms debounce

    return () => clearTimeout(timer)
  }, [searchInput, router, searchParams])

  const handleFilterChange = (
    key: 'channelId' | 'deleted' | 'visible',
    value: string,
  ) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === '') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    // Reset to page 1 when filters change
    params.delete('page')
    router.push(`/videos?${params.toString()}`)
  }

  return (
    <div className="mb-4 flex flex-wrap gap-4">
      <div>
        <label
          className="mb-1 block font-medium text-gray-700 text-sm"
          htmlFor="search-filter"
        >
          タイトルまたはIDで検索
        </label>
        <input
          className="rounded-md border border-gray-300 px-3 py-2"
          id="search-filter"
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="検索..."
          type="text"
          value={searchInput}
        />
      </div>
      <div>
        <label
          className="mb-1 block font-medium text-gray-700 text-sm"
          htmlFor="channel-filter"
        >
          チャンネルで絞り込み
        </label>
        <select
          className={twMerge(selectClasses, 'w-full max-w-full sm:w-auto')}
          id="channel-filter"
          onChange={(e) => handleFilterChange('channelId', e.target.value)}
          value={currentChannelId}
        >
          <option value="">すべてのチャンネル</option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          className="mb-1 block font-medium text-gray-700 text-sm"
          htmlFor="status-filter"
        >
          ステータスで絞り込み
        </label>
        <select
          className={selectClasses}
          id="status-filter"
          onChange={(e) => handleFilterChange('visible', e.target.value)}
          value={currentVisible}
        >
          <option value="">すべて</option>
          <option value="true">公開中のみ</option>
          <option value="false">非表示のみ</option>
        </select>
      </div>
      <div>
        <label
          className="mb-1 block font-medium text-gray-700 text-sm"
          htmlFor="deleted-filter"
        >
          削除状態で絞り込み
        </label>
        <select
          className={selectClasses}
          id="deleted-filter"
          onChange={(e) => handleFilterChange('deleted', e.target.value)}
          value={currentDeleted}
        >
          <option value="">すべて</option>
          <option value="false">削除されていないもののみ</option>
          <option value="true">削除済みのみ</option>
        </select>
      </div>
    </div>
  )
}
