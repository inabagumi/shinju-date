import '@/styles/global.css'

import type { AppProps } from 'next/app'
import { DefaultSeo } from 'next-seo'
import { ThemeProvider } from 'next-themes'
import { useCallback, useEffect } from 'react'
import type { FC } from 'react'
import { SWRConfig } from 'swr'

import ProgressBar from '@/components/ProgressBar'
import { fetcher } from '@/utils'

const MyApp: FC<AppProps> = ({ Component, pageProps, router }) => {
  const handleRouterChangeComplete = useCallback((url: string) => {
    const trackingID = process.env.NEXT_PUBLIC_GA_TRACKING_ID

    if (!trackingID) return

    setTimeout(() => {
      gtag('config', trackingID, {
        page_location: url,
        page_title: document.title
      })
    }, 0)
  }, [])

  useEffect(() => {
    router.events.on('routeChangeComplete', handleRouterChangeComplete)

    return () => {
      router.events.off('routeChangeComplete', handleRouterChangeComplete)
    }
  }, [router.events, handleRouterChangeComplete])

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
