import { subHours } from 'date-fns'
import { NextPage } from 'next'
import { NextSeo } from 'next-seo'
import React, { useState } from 'react'
import useSWR from 'swr'

import Timeline from '@/components/organisms/Timeline'
import { useSiteMetadata } from '@/context/SiteContext'
import type { SearchResponseBody } from '@/types'
import { buildQueryString } from '@/utils'

const getRequestURL = (now = new Date()): string => {
  const apiURL = '/api/search'
  const queryString = buildQueryString({
    count: 100,
    since: subHours(now, 2).toJSON()
  })

  return queryString ? `${apiURL}?${queryString}` : apiURL
}

const IndexPage: NextPage = () => {
  const now = useState(() => new Date())[0]
  const { data: items } = useSWR<SearchResponseBody>(() => getRequestURL(now), {
    refreshInterval: 10 * 1000
  })
  const { baseURL, description, title } = useSiteMetadata()

  return (
    <>
      <NextSeo
        canonical={`${baseURL}/`}
        description={description}
        openGraph={{
          images: [
            {
              height: 630,
              url: `${baseURL}/main-visual.jpg`,
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

      <div className="container margin-bottom--lg">
        <Timeline values={items} />
      </div>
    </>
  )
}

export default IndexPage
