'use client'

import { SEARCH_RESULT_COUNT, TIME_ZONE } from '@shinju-date/constants'
import { twMerge } from '@shinju-date/ui'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useId, useMemo } from 'react'
import { useInView } from 'react-intersection-observer'
import { formatDateHeading } from '@/lib/date-heading'
import { fetchVideos, type Video } from '@/lib/fetchers'
import type { VideoKindFilter } from '@/lib/video-kind-filter'
import { useNow } from './timer'
import VideoCardList, { VideoCardListSkeleton } from './video-card-list'

/** PC 4列、タブレット 2列、モバイルは横型のカードで1列 */
const LIST_CLASS_NAME = 'lg:grid-cols-4'

/**
 * スケルトンを1段ぶんだけ表示する。モバイルは1件、タブレットは2件、PC は4件。
 */
function getRowSkeletonItemClassName(index: number): string | undefined {
  if (index === 0) {
    return undefined
  }

  return index === 1 ? 'hidden sm:flex' : 'hidden lg:flex'
}

interface VideoCardRowSkeletonProps {
  className?: string | undefined
}

function VideoCardRowSkeleton({ className }: VideoCardRowSkeletonProps) {
  return (
    <VideoCardListSkeleton
      className={twMerge(LIST_CLASS_NAME, className)}
      count={4}
      itemClassName={getRowSkeletonItemClassName}
    />
  )
}

/**
 * 日付の見出し。スクロール中はサイトのヘッダー（高さ 56px）の下に固定する。
 *
 * 下を流れるカードを隠すため、地はページの地（`app/layout.tsx` の `body`）と
 * 同じ `bg-background` にする。
 */
const DATE_HEADING_CLASS_NAME =
  'sticky top-14 z-10 -mx-4 mb-4 bg-background px-4 py-2 text-heading font-bold'

export function SearchResultsSkeleton() {
  return (
    <div aria-hidden="true">
      <div className={DATE_HEADING_CLASS_NAME}>
        <div className="h-[1lh] w-32 animate-pulse rounded-control bg-muted" />
      </div>
      <VideoCardRowSkeleton />
    </div>
  )
}

interface DateSectionProps {
  date: Temporal.PlainDate
  today: Temporal.PlainDate
  values: Video[]
}

function DateSection({ date, today, values }: DateSectionProps) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} data-testid="date-section">
      <h2 className={DATE_HEADING_CLASS_NAME} id={headingId}>
        <time dateTime={date.toString()}>{formatDateHeading(date, today)}</time>
      </h2>

      <VideoCardList
        className={LIST_CLASS_NAME}
        showUpcomingLabel
        values={values}
      />
    </section>
  )
}

interface SearchResultsProps {
  kind?: VideoKindFilter
  prefetchedData?: Video[][]
  query?: string
  /** 絞り込むタレントの ID。空のときはすべてのタレントが対象になる */
  talentIds?: string[]
}

const NO_TALENT_IDS: string[] = []

export default function SearchResults({
  kind = 'all',
  prefetchedData,
  query = '',
  talentIds = NO_TALENT_IDS,
}: SearchResultsProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      getNextPageParam: (lastPage) => {
        if (lastPage.length < SEARCH_RESULT_COUNT) {
          return undefined
        }
        const lastVideo = lastPage.at(-1)
        if (!lastVideo) {
          return undefined
        }
        return Temporal.Instant.from(lastVideo.published_at).subtract({
          nanoseconds: 1,
        }).epochNanoseconds
      },
      ...(prefetchedData
        ? {
            initialData: {
              pageParams: [undefined],
              pages: prefetchedData,
            },
          }
        : {}),
      initialPageParam: undefined as bigint | undefined,
      queryFn: ({ pageParam }) => {
        return fetchVideos({
          kind,
          query,
          talentIds,
          until: pageParam,
        })
      },
      queryKey: ['videos', { kind, query, talentIds }],
    })

  const { ref: loadMoreRef, inView } = useInView({
    rootMargin: '200px',
    threshold: 0,
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const today = useNow().toPlainDate()
  const items = useMemo(() => data?.pages.flat() ?? [], [data])
  // 新しい順に並んでいるので、同じ日付の動画は続けて現れる
  const groups = useMemo(
    () =>
      Map.groupBy(items, (item) =>
        Temporal.Instant.from(item.published_at)
          .toZonedDateTimeISO(TIME_ZONE)
          .toPlainDate()
          .toString(),
      ),
    [items],
  )

  if (isLoading && !data) {
    return <SearchResultsSkeleton />
  }

  if (items.length === 0) {
    return null // Let the parent handle empty state
  }

  return (
    <div>
      <div className="space-y-10">
        {[...groups.entries()].map(([date, values]) => (
          <DateSection
            date={Temporal.PlainDate.from(date)}
            key={date}
            today={today}
            values={values}
          />
        ))}
      </div>

      {/* Loading trigger element - only show when there might be more data */}
      {hasNextPage && (
        <div ref={loadMoreRef}>
          {isFetchingNextPage && <VideoCardRowSkeleton className="mt-10" />}
        </div>
      )}

      {/* End of data message */}
      {!hasNextPage && !isFetchingNextPage && (
        <p className="mt-10 py-4 text-center text-meta text-muted">
          これ以上動画はありません
        </p>
      )}
    </div>
  )
}
