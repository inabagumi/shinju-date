import { NextPage } from 'next'
import { NextSeo } from 'next-seo'
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
      <NextSeo
        canonical={baseUrl + path}
        description={description}
        noindex={!!query}
        openGraph={{
          images: [
            {
              height: 630,
              url: baseUrl + '/main-visual.jpg',
              width: 1200
            }
          ],
          type: 'website'
        }}
        title={title}
        twitter={{
          cardType: 'summary_large_image'
        }}
      />

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
