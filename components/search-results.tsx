import { Temporal } from '@js-temporal/polyfill'
import clsx from 'clsx'
import chunk from 'lodash.chunk'
import { type VFC, useCallback } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import useSWRInfinite, { type InfiniteFetcher } from 'swr/infinite'
import { useNow } from '../components/layout'
import { type Video, getVideosByChannelIDs } from '../lib/algolia'
import { type Channel } from '../lib/supabase'
import NoResults from './no-results'
import styles from './search-results.module.css'
import VideoCard from './video-card'

export const SEARCH_RESULT_COUNT = 9

type FetchVideosByChannelIDsOptions = {
  channelIDs?: string[]
  now: number
  page?: number
  query?: string
}

type KeyLoader = (
  index: number,
  previousPageData: Video[]
) => FetchVideosByChannelIDsOptions

export const fetchVideosByChannelIDs: InfiniteFetcher<Video[], KeyLoader> = ({
  channelIDs = [],
  now: rawNow,
  page = 1,
  query = ''
}) => {
  const now = Temporal.Instant.fromEpochSeconds(rawNow)
  const until = now.toZonedDateTimeISO('UTC').add({ months: 2 }).toInstant()

  return getVideosByChannelIDs(channelIDs, {
    filters: [`publishedAt <= ${until.epochSeconds}`],
    limit: SEARCH_RESULT_COUNT,
    page,
    query
  })
}

type Props = {
  channels?: Channel[]
  prefetchedData?: Video[][]
  query?: string
  title?: string
}

const SearchResults: VFC<Props> = ({
  channels = [],
  prefetchedData,
  query = '',
  title
}) => {
  const now = useNow()
  const { data, setSize } = useSWRInfinite<Video[], Error, KeyLoader>(
    (index) => ({
      channelIDs: channels.map((channel) => channel.slug),
      now: now.epochSeconds,
      page: index + 1,
      query
    }),
    fetchVideosByChannelIDs,
    {
      fallbackData: prefetchedData
    }
  )

  const loadMore = useCallback(() => setSize((x) => x + 1), [setSize])

  const items = data ? data.flat() : []
  const isEmpty = data?.[0]?.length === 0
  const isReachingEnd =
    isEmpty || (!!data && data[data.length - 1]?.length < SEARCH_RESULT_COUNT)
  const placeholder = (
    <div className="row">
      <div className="col col--4 padding-bottom--lg padding-horiz--sm">
        <VideoCard />
      </div>
      <div className="col col--4 padding-bottom--lg padding-horiz--sm">
        <VideoCard />
      </div>
    </div>
  )

  return (
    <div className="container">
      {!isEmpty ? (
        <div className="margin-top--lg">
          {title && (
            <h1 className={clsx('margin-bottom--lg', styles.searchResultsFor)}>
              {title}
            </h1>
          )}

          <InfiniteScroll
            className="container"
            dataLength={items.length}
            hasMore={!isReachingEnd}
            loader={placeholder}
            next={loadMore}
            scrollThreshold={0.8}
            style={{
              WebkitOverflowScrolling: undefined,
              height: undefined,
              overflow: undefined
            }}
          >
            {chunk(items, 3).map((values) => (
              <div
                className="row"
                key={values.map((value) => value.id).join(':')}
              >
                {values.map((value) => (
                  <div
                    className="col col--4 padding-bottom--lg padding-horiz--sm"
                    key={value.id}
                  >
                    <VideoCard
                      timeOptions={{
                        relativeTime: true
                      }}
                      value={value}
                    />
                  </div>
                ))}
              </div>
            ))}
          </InfiniteScroll>
        </div>
      ) : (
        <NoResults
          message={`『{query}』で検索しましたが一致する動画は見つかりませんでした。`}
          title="検索結果はありません"
        />
      )}
    </div>
  )
}

export default SearchResults
