import { NextPage } from 'next'
import Head from 'next/head'
import React, { ReactElement, useContext } from 'react'
import Search from '../components/molecules/search'
import { SiteContext } from '../context/site-context'

export type SearchProps = {
  query: string
}

const SearchPage: NextPage<SearchProps> = ({ query }): ReactElement => {
  const { baseUrl, description, title: siteTitle } = useContext(SiteContext)

  const title = [query, siteTitle].filter(Boolean).join(' - ')
  const path = query ? `/search?q=${encodeURIComponent(query)}` : '/'

  return (
    <>
      <Head>
        <title>{title}</title>

        {description && <meta content={description} name="description" />}
        {query && <meta content="noindex,follow" name="robots" />}

        <link href={baseUrl + path} rel="canonical" />

        <meta content={description} property="og:description" />
        <meta content={`${baseUrl}/main-visual.jpg`} property="og:image" />
        <meta content={title} property="og:title" />
        <meta content="website" property="og:type" />
        <meta content={baseUrl + path} property="og:url" />

        <meta content="summary_large_image" name="twitter:card" />
      </Head>

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
