import { NextPage } from 'next'
import React, { ReactElement, useCallback, useState, useEffect } from 'react'
import { Helmet } from 'react-helmet'
import { Waypoint } from 'react-waypoint'
import Spinner from '../components/atoms/spinner'
import SearchResults from '../components/molecules/search-results'
import search from '../lib/search'
import { getTitle } from '../lib/title'
import Video from '../types/video'

export type SearchProps = {
  hasNext: boolean
  hits: Video[]
  query: string
}

const Search: NextPage<SearchProps> = ({
  hasNext: initialHasNext,
  hits,
  query
}): ReactElement => {
  const [results, setResults] = useState<Video[]>(hits)
  const [page, setPage] = useState<number>(0)
  const [hasNext, setHasNext] = useState<boolean>(initialHasNext)

  const onEnter = useCallback((): void => {
    search<Video>(query, { page: page + 1 })
      .then(({ hits, nbPages, page: actualPage }): void => {
        setHasNext(actualPage < nbPages - 1)
        setPage(actualPage)
        setResults((prevResults): Video[] => prevResults.concat(hits))
      })
      .catch((): void => {
        setHasNext(false)
      })
  }, [page, query])

  useEffect((): void => {
    setResults(hits)
    setPage(0)
    setHasNext(initialHasNext)
  }, [hits, initialHasNext])

  const title = [query, getTitle()].filter(Boolean).join(' - ')
  const description = process.env.ANIMARE_SEARCH_DESCRIPTION
  const baseUrl = process.env.ANIMARE_SEARCH_BASE_URL || 'https://example.com'
  const path = query ? `/search?q=${encodeURIComponent(query)}` : '/'

  return (
    <>
      <Helmet htmlAttributes={{ lang: 'ja' }}>
        {query && <title>{query}</title>}

        {description && <meta content={description} name="description" />}
        {query && <meta content="noindex,follow" name="robots" />}

        <link href={baseUrl + path} rel="canonical" />

        <meta content={description} property="og:description" />
        <meta
          content={`${baseUrl}/static/main-visual.png`}
          property="og:image"
        />
        <meta content={title} property="og:title" />
        <meta content="website" property="og:type" />
        <meta content={baseUrl + path} property="og:url" />

        <meta content="summary_large_image" name="twitter:card" />
      </Helmet>

      <main>
        <SearchResults values={results} />

        <footer className="search__footer">
          {hasNext && (
            <Waypoint onEnter={onEnter}>
              <div className="search__loading">
                <Spinner aria-label="読み込み中..." />
              </div>
            </Waypoint>
          )}
        </footer>
      </main>

      <style jsx>{`
        .search__footer {
          padding: 2rem 0;
        }

        .search__loading {
          align-items: center;
          display: flex;
          height: 100%;
          justify-content: center;
        }
      `}</style>
    </>
  )
}

Search.getInitialProps = async ({ query }): Promise<SearchProps> => {
  const q = (Array.isArray(query.q) ? query.q[0] : query.q) || ''
  const { hits, nbPages } = await search<Video>(q)

  if (typeof window !== 'undefined') window.scrollTo(0, 0)

  return {
    hasNext: nbPages > 1,
    hits,
    query: q
  }
}

export default Search
