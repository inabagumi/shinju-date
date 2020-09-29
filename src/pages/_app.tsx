import '@/styles/index.css'

import { AppProps } from 'next/app'
import { FC } from 'react'
import { SWRConfig } from 'swr'

import { SiteProvider } from '@/context/SiteContext'
import { fetcher } from '@/utils'

const MyApp: FC<AppProps> = ({ Component, pageProps }) => {
  return (
    <SWRConfig value={{ fetcher }}>
      <SiteProvider>
        <Component {...pageProps} />
      </SiteProvider>
    </SWRConfig>
  )
}

export default MyApp
