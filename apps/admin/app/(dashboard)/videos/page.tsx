import { formatNumber } from '@shinju-date/helpers'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { TableSkeleton } from '@/components/skeletons'
import getChannels from '../channels/_lib/get-channels'
import Pagination from './_components/pagination'
import { VideoFilters } from './_components/video-filters'
import { VideoTable } from './_components/video-table'
import {
  getVideos,
  type VideoFilters as VideoFiltersType,
} from './_lib/get-videos'
import {
  DEFAULT_VALUES,
  type VideoSearchParams,
  videoSearchParamsSchema,
} from './_lib/search-params-schema'

export const metadata: Metadata = {
  title: '動画管理',
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function VideosPage({ searchParams }: Props) {
  const rawParams = await searchParams

  // Validate and parse search parameters using zod schema
  // If validation fails, use default values to prevent crashes
  let validatedParams: VideoSearchParams
  try {
    validatedParams = videoSearchParamsSchema.parse(rawParams)
  } catch (_error) {
    // If parsing fails, use safeParse to get default values
    const result = videoSearchParamsSchema.safeParse({})
    validatedParams = result.success ? result.data : DEFAULT_VALUES
  }

  const currentPage = validatedParams.page
  const perPage = 20

  // Build filters from validated parameters
  const filters: VideoFiltersType = {}
  if (validatedParams.channelId !== undefined) {
    filters.channelId = validatedParams.channelId
  }
  if (validatedParams.visible !== undefined) {
    filters.visible = validatedParams.visible
  }
  if (validatedParams.search) {
    filters.search = validatedParams.search
  }
  if (validatedParams.deleted !== undefined) {
    filters.deleted = validatedParams.deleted
  }

  // Get sort parameters from validated data
  const sortField = validatedParams.sortField
  const sortOrder = validatedParams.sortOrder

  // Fetch channels and total count outside Suspense to avoid layout shift
  const [channels, { total }] = await Promise.all([
    getChannels(),
    getVideos(currentPage, perPage, filters, sortField, sortOrder),
  ])
  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="font-bold text-2xl">動画管理</h1>
        <p className="text-gray-600">全 {formatNumber(total)} 件の動画</p>
      </div>

      <VideoFilters channels={channels} />

      <Suspense fallback={<TableSkeleton rows={perPage} />}>
        <VideoTable
          currentPage={currentPage}
          filters={filters}
          perPage={perPage}
          sortField={sortField}
          sortOrder={sortOrder}
        />
      </Suspense>
      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} />
      )}
    </div>
  )
}
