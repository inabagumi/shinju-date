import { NextPage } from 'next'
import React, { ReactElement } from 'react'
import { Helmet } from 'react-helmet'
import Search from '../components/molecules/search'
import { getTitle } from '../lib/title'

export type SearchProps = {
  query: string
}

const SearchPage: NextPage<SearchProps> = ({ query }): ReactElement => {
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
        <meta content={`${baseUrl}/main-visual.png`} property="og:image" />
        <meta content={title} property="og:title" />
        <meta content="website" property="og:type" />
        <meta content={baseUrl + path} property="og:url" />

        <meta content="summary_large_image" name="twitter:card" />
      </Helmet>

      <Search query={query} />
    </>
  )
}

SearchPage.getInitialProps = async ({ query }): Promise<SearchProps> => {
  const q = (Array.isArray(query.q) ? query.q[0] : query.q) || ''

  if (typeof window !== 'undefined') window.scrollTo(0, 0)

  return {
    query: q
  }
}

export default SearchPage
