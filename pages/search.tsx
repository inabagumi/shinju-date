import { NextContext, NextFC } from 'next'
import Head from 'next/head'
import React from 'react'
import SearchResults from '../components/search-results'
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
  return (
    <>
      <Head>
        <title>{query} - AniMare Search</title>
      </Head>

      <SearchResults values={hits} />
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
