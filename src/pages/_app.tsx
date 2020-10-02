import '@/styles/global.css'

import type { AppProps } from 'next/app'
import { DefaultSeo } from 'next-seo'
import type { FC } from 'react'
import { RecoilRoot } from 'recoil'
import { SWRConfig } from 'swr'

import ProgressBar from '@/components/ProgressBar'
import { fetcher } from '@/utils'

const MyApp: FC<AppProps> = ({ Component, pageProps }) => {
  return (
    <RecoilRoot>
      <SWRConfig value={{ fetcher }}>
        <DefaultSeo titleTemplate="%s - SHINJU DATE" />
        <ProgressBar options={{ showSpinner: false }} />
        <Component {...pageProps} />
      </SWRConfig>
    </RecoilRoot>
  )
}

export default MyApp
