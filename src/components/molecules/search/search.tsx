import chunk from 'lodash/chunk'
import React, {
  FC,
  ReactElement,
  useCallback,
  useEffect,
  useState
} from 'react'
import { InView } from 'react-intersection-observer'
import search from '../../../lib/search'
import Video from '../../../types/video'
import Spinner from '../../atoms/spinner'
import VideoCard from '../../atoms/video-card'

const COLUMNS_COUNT = 3

interface Props {
  query: string
}

const Search: FC<Props> = ({ query }): ReactElement => {
  const [results, setResults] = useState<Video[]>([])
  const [page, setPage] = useState(0)
  const [hasNext, setHasNext] = useState(true)

  useEffect(() => {
    search<Video>(query)
      .then(({ hits, nbPages }): void => {
        setHasNext(nbPages > 1)
        setResults(hits)
      })
      .catch((): void => {
        setHasNext(false)
      })
  }, [query])

  const handleChange = useCallback(() => {
    search<Video>(query, { page: page + 1 })
      .then(({ hits, nbPages, page: actualPage }): void => {
        setHasNext(actualPage < nbPages - 1)
        setPage(actualPage)
        setResults((prevResults): Video[] => prevResults.concat(hits))
      })
      .catch((): void => {
        setHasNext(false)
      })
  }, [query, page])

  return (
    <>
      <div className="margin-top--lg">
        {chunk(results, COLUMNS_COUNT).map(
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
