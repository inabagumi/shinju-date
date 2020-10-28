import '@/styles/global.css'

import type { AppProps } from 'next/app'
import { DefaultSeo } from 'next-seo'
import { ThemeProvider } from 'next-themes'
import type { FC } from 'react'
import { SWRConfig } from 'swr'

import ProgressBar from '@/components/ProgressBar'
import { fetcher } from '@/utils'

const MyApp: FC<AppProps> = ({ Component, pageProps }) => {
  return (
    <SWRConfig value={{ fetcher }}>
      <ThemeProvider defaultTheme="system">
        <DefaultSeo titleTemplate="%s - SHINJU DATE" />
        <ProgressBar options={{ showSpinner: false }} />
        <Component {...pageProps} />
      </ThemeProvider>
    </SWRConfig>
  )
}

export default MyApp
