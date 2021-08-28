import '@/styles/global.css'

import type { AppProps } from 'next/app'
import Head from 'next/head'
import { DefaultSeo } from 'next-seo'
import { ThemeProvider } from 'next-themes'
import { useCallback, useEffect } from 'react'
import type { VFC } from 'react'
import { SWRConfig } from 'swr'

import appleTouchIcon from '@/assets/apple-touch-icon.png'
import favicon192x192 from '@/assets/favicon-192x192.png'
import favicon512x512 from '@/assets/favicon-512x512.png'
import ProgressBar from '@/components/ProgressBar'
import fetcher from '@/utils/fetcher'

const MyApp: VFC<AppProps> = ({ Component, pageProps, router }) => {
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
        <Head>
          <link
            href={favicon192x192.src}
            rel="icon"
            sizes={`${favicon192x192.width}x${favicon192x192.height}`}
            type="image/png"
          />
          <link
            href={favicon512x512.src}
            rel="icon"
            sizes={`${favicon512x512.width}x${favicon512x512.height}`}
            type="image/png"
          />
          <link
            href={appleTouchIcon.src}
            rel="apple-touch-icon"
            sizes={`${appleTouchIcon.width}x${appleTouchIcon.height}`}
            type="image/png"
          />
        </Head>

        <DefaultSeo titleTemplate="%s - SHINJU DATE" />
        <ProgressBar options={{ showSpinner: false }} />
        <Component {...pageProps} />
      </ThemeProvider>
    </SWRConfig>
  )
}

export default MyApp
