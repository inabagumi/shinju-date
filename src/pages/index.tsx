import { NextPage } from 'next'
import { NextSeo } from 'next-seo'
import React, { useContext } from 'react'

import Search from 'components/organisms/search'
import { SiteContext } from 'context/site-context'

const IndexPage: NextPage = () => {
  const { baseUrl, description, title } = useContext(SiteContext)

  return (
    <>
      <NextSeo
        canonical={`${baseUrl}/`}
        description={description}
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

      <Search />
    </>
  )
}

export default IndexPage
