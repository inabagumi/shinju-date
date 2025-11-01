'use client'

import { Input } from '@shinju-date/ui'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

type Talent = {
  created_at: string
  id: string
  name: string
  updated_at: string
}

type Props = {
  talents: Talent[]
}

export function VideoFilters({ talents }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchInput, setSearchInput] = useState(
    searchParams.get('search') || '',
  )

  const currentTalentId = searchParams.get('talentId') || ''
  const currentDeleted = searchParams.get('deleted') || ''
  const currentVisible = searchParams.get('visible') || ''

  // Debounce search input
  useEffect(() => {
    const currentSearch = searchParams.get('search') || ''

    // Only trigger navigation if the search input actually changed from URL
    if (searchInput === currentSearch) {
      return
    }

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
  }, [searchInput, router, searchParams]) // Re-added searchParams since we need it to check current value

  const handleFilterChange = (
    key: 'deleted' | 'talentId' | 'visible',
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
        <Input
          id="search-filter"
          inputSize="md"
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="検索..."
          value={searchInput}
          variant="default"
        />
      </div>
      <div>
        <label
          className="mb-1 block font-medium text-gray-700 text-sm"
          htmlFor="talent-filter"
        >
          タレントで絞り込み
        </label>
        <select
          className="w-full max-w-full appearance-none rounded-md border border-gray-300 bg-[url('data:image/svg+xml,%3csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2016%2016%27%3e%3cpath%20fill=%27none%27%20stroke=%27%23333%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%20stroke-width=%272%27%20d=%27m2%205%206%206%206-6%27/%3e%3c/svg%3e')] bg-position-[right_0.5rem_center] bg-size-[1em] bg-no-repeat px-3 py-2 pr-8 sm:w-auto"
          id="talent-filter"
          onChange={(e) => handleFilterChange('talentId', e.target.value)}
          value={currentTalentId}
        >
          <option value="">すべてのタレント</option>
          {talents.map((talent) => (
            <option key={talent.id} value={talent.id}>
              {talent.name}
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
          className="appearance-none rounded-md border border-gray-300 bg-[length:1em] bg-[position:right_0.5rem_center] bg-[url('data:image/svg+xml,%3csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2016%2016%27%3e%3cpath%20fill=%27none%27%20stroke=%27%23333%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%20stroke-width=%272%27%20d=%27m2%205%206%206%206-6%27/%3e%3c/svg%3e')] bg-no-repeat px-3 py-2 pr-8"
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
          className="appearance-none rounded-md border border-gray-300 bg-[url('data:image/svg+xml,%3csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2016%2016%27%3e%3cpath%20fill=%27none%27%20stroke=%27%23333%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%20stroke-width=%272%27%20d=%27m2%205%206%206%206-6%27/%3e%3c/svg%3e')] bg-position-[right_0.5rem_center] bg-size-[1em] bg-no-repeat px-3 py-2 pr-8"
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
