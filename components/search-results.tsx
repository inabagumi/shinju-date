import clsx from 'clsx'
import chunk from 'lodash.chunk'
import { useCallback } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import useSWRInfinite from 'swr/infinite'
import { useBasePath } from '../components/layout'
import { getVideosByChannelIDs } from '../lib/algolia'
import Link from './link'
import styles from './search-results.module.css'
import VideoCard from './video-card'
import type { Channel, Video } from '../lib/algolia'
import type { VFC } from 'react'

export const SEARCH_RESULT_COUNT = 9

export function getVideosByChannelIDsWithPage(
  channelIDs: string[] = [],
  page = 1,
  query = ''
): Promise<Video[]> {
  return getVideosByChannelIDs(channelIDs, {
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
  const { data, setSize } = useSWRInfinite<Video[]>(
    (index: number) => [
      channels.map((channel) => channel.id),
      index + 1,
      query
    ],
    getVideosByChannelIDsWithPage,
    {
      fallbackData: prefetchedData
    }
  )
  const basePath = useBasePath()

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
        <div className="text--center margin-bottom--lg margin-top--lg padding-bottom--lg padding-top--lg">
          <h1 className={styles.searchResultsFor}>検索結果はありません</h1>

          <p>『{query}』で検索しましたが一致する動画は見つかりませんでした。</p>

          <Link
            className="button button--lg button--outline button--primary"
            href={basePath}
            role="button"
          >
            新着動画を見る
          </Link>
        </div>
      )}
    </div>
  )
}

export default SearchResults
