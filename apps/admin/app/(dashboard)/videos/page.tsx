import { formatNumber } from '@shinju-date/helpers'
import { PageHeader } from '@shinju-date/ui'
import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import { Suspense } from 'react'
import { TableSkeleton } from '@/components/skeletons'
import { getTalents } from '../talents/_lib/get-talents'
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

async function VideoFiltersData() {
  'use cache: private'

  cacheLife('minutes')

  const talents = await getTalents()

  return <VideoFilters talents={talents} />
}

async function VideoTableData({
  searchParams,
}: {
  searchParams: PageProps<'/'>['searchParams']
}) {
  'use cache: private'

  cacheLife('minutes')

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
  if (validatedParams.talentId !== undefined) {
    filters.talentId = validatedParams.talentId
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
  if (validatedParams.status !== undefined) {
    filters.status = validatedParams.status
  }
  if (validatedParams.platform !== undefined) {
    filters.platform = validatedParams.platform
  }
  if (validatedParams.videoKind !== undefined) {
    filters.videoKind = validatedParams.videoKind
  }

  // Get sort parameters from validated data
  const sortField = validatedParams.sortField
  const sortOrder = validatedParams.sortOrder

  const { videos, total } = await getVideos(
    currentPage,
    perPage,
    filters,
    sortField,
    sortOrder,
  )
  const totalPages = Math.ceil(total / perPage)

  return (
    <>
      <VideoTable videos={videos} />
      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} />
      )}
    </>
  )
}

async function VideoCountData({
  searchParams,
}: {
  searchParams: PageProps<'/'>['searchParams']
}) {
  'use cache: private'

  cacheLife('minutes')

  const rawParams = await searchParams
  let validatedParams: VideoSearchParams
  try {
    validatedParams = videoSearchParamsSchema.parse(rawParams)
  } catch (_error) {
    const result = videoSearchParamsSchema.safeParse({})
    validatedParams = result.success ? result.data : DEFAULT_VALUES
  }

  const currentPage = validatedParams.page
  const perPage = 20

  const filters: VideoFiltersType = {}
  if (validatedParams.talentId !== undefined) {
    filters.talentId = validatedParams.talentId
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
  if (validatedParams.status !== undefined) {
    filters.status = validatedParams.status
  }
  if (validatedParams.platform !== undefined) {
    filters.platform = validatedParams.platform
  }
  if (validatedParams.videoKind !== undefined) {
    filters.videoKind = validatedParams.videoKind
  }

  const sortField = validatedParams.sortField
  const sortOrder = validatedParams.sortOrder

  const { total } = await getVideos(
    currentPage,
    perPage,
    filters,
    sortField,
    sortOrder,
  )

  return <span className="tabular-nums">全 {formatNumber(total)} 件の動画</span>
}

export default function VideosPage({ searchParams }: PageProps<'/'>) {
  return (
    <div>
      <PageHeader
        description={
          <Suspense
            fallback={
              <span
                aria-hidden="true"
                className="inline-block h-4 w-32 animate-pulse rounded-control bg-muted align-middle"
              />
            }
          >
            <VideoCountData searchParams={searchParams} />
          </Suspense>
        }
        title="動画管理"
      />

      {/* Filters with independent Suspense */}
      <Suspense
        fallback={
          <div aria-hidden="true" className="mb-4 animate-pulse space-y-3">
            <div className="h-16 w-full rounded-control bg-muted sm:max-w-md" />
            <div className="hidden gap-3 md:flex">
              <div className="h-16 w-48 rounded-control bg-muted" />
              <div className="h-16 w-48 rounded-control bg-muted" />
              <div className="h-16 w-48 rounded-control bg-muted" />
            </div>
          </div>
        }
      >
        <VideoFiltersData />
      </Suspense>

      {/* Video table with independent Suspense */}
      <Suspense fallback={<TableSkeleton rows={8} />}>
        <VideoTableData searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
