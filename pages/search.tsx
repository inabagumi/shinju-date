import { NextContext, NextFC } from 'next'
import Head from 'next/head'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import SearchResults from '../components/molecules/search-results'
import search from '../lib/search'
import Video from '../types/video'

type Props = {
  hits: Video[]
  query: string
}

type Query = {
  q: string
}

const Search: NextFC<Props, Props, NextContext<Query>> = ({ hits, query }) => {
  const targetRef = useRef<HTMLParagraphElement>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [hasNext, setHasNext] = useState<boolean>(true)
  const [page, setPage] = useState<number>(0)
  const [results, setResults] = useState<Video[]>(hits)

  useEffect(() => {
    setHasNext(true)
    setPage(0)
    setResults(hits)
  }, [hits])

  useEffect(() => {
    if (isLoading || !hasNext || !targetRef.current) return

    const observer = new IntersectionObserver(entries => {
      if (!entries.every(entry => entry.isIntersecting)) return

      setIsLoading(true)

      search<Video>(query, { page: page + 1 })
        .then(response => {
          setPage(prevPage => prevPage + 1)
          setResults(prevResults => prevResults.concat(response.hits))

          if (page >= response.nbPages) setHasNext(false)
        })
        .catch(() => {
          setHasNext(false)
        })
        .finally(() => {
          setIsLoading(false)
        })
    })

    observer.observe(targetRef.current)

    return () => {
      observer.disconnect()
    }
  }, [targetRef.current, isLoading, hasNext, query, page])

  return (
    <>
      <Head>
        <meta content="noindex,follow" name="robots" />
      </Head>

      <style jsx>{`
        .notfound {
          align-items: center;
          display: flex;
          height: 100%;
          justify-content: center;
        }

        .notfound p {
          color: #424242;
          font-size: 1.25rem;
          line-height: 1.5;
          margin: 0;
          padding: 1rem 0.5rem;
        }
      `}</style>

      <main>
        {results.length > 0 ? (
          <SearchResults values={results} />
        ) : (
          <div className="notfound">
            <p>検索結果がありません</p>
          </div>
        )}

        <p ref={targetRef} />
      </main>
    </>
  )
}

Search.getInitialProps = async ({ query }) => {
  const { hits } = await search<Video>(query.q)

  return {
    hits,
    query: query.q
  }
}

export default Search
