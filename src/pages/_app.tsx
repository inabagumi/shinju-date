import '@/styles/global.css'

import type { AppProps } from 'next/app'
import { DefaultSeo } from 'next-seo'
import type { FC } from 'react'
import { SWRConfig } from 'swr'

import ProgressBar from '@/components/ProgressBar'
import { SiteProvider } from '@/context/SiteContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { fetcher } from '@/utils'

const MyApp: FC<AppProps> = ({ Component, pageProps }) => {
  const title = process.env.NEXT_PUBLIC_TITLE

  return (
    <SWRConfig value={{ fetcher }}>
      <SiteProvider>
        <ThemeProvider>
          <DefaultSeo titleTemplate={title ? `%s - ${title}` : '%s'} />
          <ProgressBar options={{ showSpinner: false }} />
          <Component {...pageProps} />
        </ThemeProvider>
      </SiteProvider>
    </SWRConfig>
  )
}

export default MyApp
