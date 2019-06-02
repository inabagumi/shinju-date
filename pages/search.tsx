import { NextContext, NextFC } from 'next'
import Head from 'next/head'
import React from 'react'
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

const Search: NextFC<Props, Props, NextContext<Query>> = ({ hits }) => {
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

      {hits.length > 0 ? (
        <SearchResults values={hits} />
      ) : (
        <div className="notfound">
          <p>検索結果がありません</p>
        </div>
      )}
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
