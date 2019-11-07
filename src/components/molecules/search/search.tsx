import chunk from 'lodash/chunk'
import React, {
  FC,
  ReactElement,
  useCallback,
  useEffect,
  useState
} from 'react'
import { InView } from 'react-intersection-observer'
import useSearch from '../../../hooks/use-search'
import Video from '../../../types/video'
import Spinner from '../../atoms/spinner'
import VideoCard from '../../atoms/video-card'

const COLUMNS_COUNT = 3

interface Props {
  query: string
}

const Search: FC<Props> = ({ query }): ReactElement => {
  const [page, setPage] = useState(0)
  const { hasNext, items } = useSearch<Video>(query, page)

  useEffect((): void => {
    setPage(0)
  }, [query])

  const handleChange = useCallback(() => {
    setPage((page): number => page + 1)
  }, [])

  return (
    <>
      <div className="margin-top--lg">
        {chunk(items, COLUMNS_COUNT).map(
          (row, i): ReactElement => (
            <div className="row" key={`row-${i}`}>
              {row.map(
                (value): ReactElement => (
                  <div
                    className={`col col--${12 /
                      COLUMNS_COUNT} padding-bottom--lg padding-horiz--sm`}
                    key={value.url}
                  >
                    <VideoCard value={value} />
                  </div>
                )
              )}
            </div>
          )
        )}
      </div>

      <footer className="search__footer">
        {hasNext && (
          <InView as="div" className="search__loading" onChange={handleChange}>
            <Spinner aria-label="読み込み中..." />
          </InView>
        )}
      </footer>

      <style jsx>{`
        .search__footer {
          padding: 2rem 0;
        }

        :global(.search__loading) {
          align-items: center;
          display: flex;
          height: 100%;
          justify-content: center;
        }
      `}</style>
    </>
  )
}

export default Search
