import { NextPage } from 'next'
import { useRouter } from 'next/router'
import { NextSeo } from 'next-seo'
import React, { useContext } from 'react'

import Search from 'components/organisms/search'
import { SiteContext } from 'context/site-context'
import getValue from 'utils/getValue'

const SearchPage: NextPage = () => {
  const { query } = useRouter()
  const { baseUrl, description, title: siteTitle } = useContext(SiteContext)

  const keyword = getValue(query.q)
  const title = [keyword, siteTitle].filter(Boolean).join(' - ')
  const path = keyword ? `/search?q=${encodeURIComponent(keyword)}` : '/'

  return (
    <>
      <NextSeo
        canonical={baseUrl + path}
        description={description}
        noindex={!!keyword}
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

      <Search query={keyword} />
    </>
  )
}

export default SearchPage
