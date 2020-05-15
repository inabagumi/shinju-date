import { GetServerSideProps, NextPage } from 'next'
import { NextSeo } from 'next-seo'
import React, { useContext } from 'react'

import Search from 'components/organisms/search'
import { SiteContext } from 'context/site-context'
import getValue from 'utils/get-value'

type Props = {
  keyword: string
}

export const getServerSideProps: GetServerSideProps<Props> = async ({
  query
}) => {
  const keyword = getValue(query.q)

  return {
    props: {
      keyword
    }
  }
}

const SearchPage: NextPage<Props> = ({ keyword }) => {
  const { baseUrl, description, title } = useContext(SiteContext)

  return (
    <>
      <NextSeo
        canonical={`${baseUrl}/search?q=${encodeURIComponent(keyword)}`}
        description={description}
        noindex
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
        title={`${keyword} - ${title}`}
        twitter={{
          cardType: 'summary_large_image'
        }}
      />

      <Search query={keyword} />
    </>
  )
}

export default SearchPage
