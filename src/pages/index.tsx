import { subHours } from 'date-fns'
import { NextPage } from 'next'
import { NextSeo } from 'next-seo'
import React, { useState } from 'react'
import useSWR from 'swr'

import Spinner from '@/components/atoms/Spinner'
import Schedule from '@/components/organisms/Schedule'
import { useSiteMetadata } from '@/context/SiteContext'
import styles from '@/styles/index.module.css'
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
        {items ? (
          <Schedule values={items} />
        ) : (
          <div className={styles.loading}>
            <Spinner />
          </div>
        )}
      </div>
    </>
  )
}

export default IndexPage
