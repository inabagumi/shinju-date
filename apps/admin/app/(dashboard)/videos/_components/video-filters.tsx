'use client'

import type { Tables } from '@shinju-date/database'
import {
  Button,
  Input,
  MultiSelect,
  type MultiSelectOption,
  twMerge,
} from '@shinju-date/ui'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

type Talent = Pick<
  Tables<'talents'>,
  'id' | 'name' | 'created_at' | 'updated_at'
>

type FilterKey =
  | 'deleted'
  | 'talentId'
  | 'visible'
  | 'status'
  | 'platform'
  | 'videoKind'

interface FilterField {
  key: FilterKey
  label: string
  options: MultiSelectOption[]
  placeholder: string
  value: string[]
}

interface Props {
  talents: Talent[]
}

export function VideoFilters({ talents }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchInput, setSearchInput] = useState(
    searchParams.get('search') || '',
  )

  // Get current filter values from URL (support arrays)
  const currentTalentIds = searchParams.getAll('talentId')
  const currentDeleted = searchParams.getAll('deleted')
  const currentVisible = searchParams.getAll('visible')
  const currentStatus = searchParams.getAll('status')
  const currentPlatform = searchParams.getAll('platform')
  const currentVideoKind = searchParams.getAll('videoKind')

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

  const handleMultiSelectChange = (key: FilterKey, values: string[]) => {
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

  const platformOptions: MultiSelectOption[] = [
    { label: 'YouTube', value: 'youtube' },
    { label: 'Twitch', value: 'twitch' },
  ]

  const deletedOptions: MultiSelectOption[] = [
    { label: '未削除', value: 'false' },
    { label: '削除済み', value: 'true' },
  ]

  const videoKindOptions: MultiSelectOption[] = [
    { label: '通常動画', value: 'standard' },
    { label: 'ショート動画', value: 'short' },
  ]

  const filters: FilterField[] = [
    {
      key: 'talentId',
      label: 'タレント',
      options: talentOptions,
      placeholder: 'すべてのタレント',
      value: currentTalentIds,
    },
    {
      key: 'status',
      label: '動画ステータス',
      options: statusOptions,
      placeholder: 'すべて',
      value: currentStatus,
    },
    {
      key: 'platform',
      label: 'プラットフォーム',
      options: platformOptions,
      placeholder: 'すべて',
      value: currentPlatform,
    },
    {
      key: 'videoKind',
      label: '動画種別',
      options: videoKindOptions,
      placeholder: 'すべて',
      value: currentVideoKind,
    },
    {
      key: 'visible',
      label: '公開状態',
      options: visibilityOptions,
      placeholder: 'すべて',
      value: currentVisible,
    },
    {
      key: 'deleted',
      label: '削除状態',
      options: deletedOptions,
      placeholder: 'すべて',
      value: currentDeleted,
    },
  ]
  const appliedCount = filters.filter(({ value }) => value.length > 0).length

  return (
    <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <div>
        <label
          className="mb-1 block text-meta font-medium"
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
      <Button
        aria-controls="video-filter-options"
        aria-expanded={isExpanded}
        className="gap-1.5 justify-self-start sm:hidden"
        onClick={() => setIsExpanded((prev) => !prev)}
        variant="secondary"
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        絞り込み
        {appliedCount > 0 && (
          <span className="rounded-full bg-accent px-2 text-caption text-accent-foreground tabular-nums">
            {appliedCount}
            <span className="sr-only">件の条件を適用中</span>
          </span>
        )}
        <ChevronDown
          aria-hidden="true"
          className={twMerge(
            'size-4 transition-transform',
            isExpanded && 'rotate-180',
          )}
        />
      </Button>
      <div
        className={twMerge('grid gap-4 sm:contents', !isExpanded && 'hidden')}
        id="video-filter-options"
      >
        {filters.map((filter) => (
          <div key={filter.key}>
            <div
              className="mb-1 block text-meta font-medium"
              id={`video-filter-${filter.key}`}
            >
              {filter.label}で絞り込み
            </div>
            <MultiSelect
              aria-labelledby={`video-filter-${filter.key} video-filter-${filter.key}-value`}
              id={`video-filter-${filter.key}-value`}
              onChange={(values) => handleMultiSelectChange(filter.key, values)}
              options={filter.options}
              placeholder={filter.placeholder}
              value={filter.value}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
