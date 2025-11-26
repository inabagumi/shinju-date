'use client'

import type { Tables } from '@shinju-date/database'
import { Input, MultiSelect, type MultiSelectOption } from '@shinju-date/ui'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

type Talent = Pick<
  Tables<'talents'>,
  'id' | 'name' | 'created_at' | 'updated_at'
>

interface Props {
  talents: Talent[]
}

export function VideoFilters({ talents }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchInput, setSearchInput] = useState(
    searchParams.get('search') || '',
  )

  // Get current filter values from URL (support arrays)
  const currentTalentIds = searchParams.getAll('talentId')
  const currentDeleted = searchParams.getAll('deleted')
  const currentVisible = searchParams.getAll('visible')
  const currentStatus = searchParams.getAll('status')

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
  }, [searchInput, router, searchParams])

  const handleMultiSelectChange = (
    key: 'deleted' | 'talentId' | 'visible' | 'status',
    values: string[],
  ) => {
    const params = new URLSearchParams(searchParams.toString())
    // Remove all existing values for this key
    params.delete(key)
    // Add new values
    for (const value of values) {
      params.append(key, value)
    }
    // Reset to page 1 when filters change
    params.delete('page')
    router.push(`/videos?${params.toString()}`)
  }

  // Define options for each filter
  const talentOptions: MultiSelectOption[] = talents.map((talent) => ({
    label: talent.name,
    value: talent.id,
  }))

  const visibilityOptions: MultiSelectOption[] = [
    { label: '表示中', value: 'true' },
    { label: '非表示', value: 'false' },
  ]

  const statusOptions: MultiSelectOption[] = [
    { label: '待機中', value: 'UPCOMING' },
    { label: '配信中', value: 'LIVE' },
    { label: '配信済み', value: 'ENDED' },
    { label: '公開済み', value: 'PUBLISHED' },
  ]

  const deletedOptions: MultiSelectOption[] = [
    { label: '未削除', value: 'false' },
    { label: '削除済み', value: 'true' },
  ]

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
      <div className="w-full sm:w-auto sm:min-w-[200px]">
        <div className="mb-1 block font-medium text-gray-700 text-sm">
          タレントで絞り込み
        </div>
        <MultiSelect
          onChange={(values) => handleMultiSelectChange('talentId', values)}
          options={talentOptions}
          placeholder="すべてのタレント"
          value={currentTalentIds}
        />
      </div>
      <div className="w-full sm:w-auto sm:min-w-[200px]">
        <div className="mb-1 block font-medium text-gray-700 text-sm">
          動画ステータスで絞り込み
        </div>
        <MultiSelect
          onChange={(values) => handleMultiSelectChange('status', values)}
          options={statusOptions}
          placeholder="すべて"
          value={currentStatus}
        />
      </div>
      <div className="flex w-full flex-wrap gap-4 sm:contents">
        <div className="w-full sm:w-auto sm:min-w-[200px]">
          <div className="mb-1 block font-medium text-gray-700 text-sm">
            公開状態で絞り込み
          </div>
          <MultiSelect
            onChange={(values) => handleMultiSelectChange('visible', values)}
            options={visibilityOptions}
            placeholder="すべて"
            value={currentVisible}
          />
        </div>
        <div className="w-full sm:w-auto sm:min-w-[200px]">
          <div className="mb-1 block font-medium text-gray-700 text-sm">
            削除状態で絞り込み
          </div>
          <MultiSelect
            onChange={(values) => handleMultiSelectChange('deleted', values)}
            options={deletedOptions}
            placeholder="すべて"
            value={currentDeleted}
          />
        </div>
      </div>
    </div>
  )
}
