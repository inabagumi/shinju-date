import 'infima/dist/css/default/default.css'
import 'nprogress/css/nprogress.css'
import 'react-toggle/style.css'

import '@/styles/global.css'

import { AppProps } from 'next/app'
import Head from 'next/head'
import Router from 'next/router'
import NProgress from 'nprogress'
import React, { FC, useCallback, useEffect } from 'react'
import { SWRConfig } from 'swr'

import { appleTouchIcon, favicon192x192, favicon512x512 } from '@/assets'
import Layout from '@/components/templates/Layout'
import { SiteProvider } from '@/context/SiteContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { fetcher } from '@/utils'

NProgress.configure({
  showSpinner: false
})

const MyApp: FC<AppProps> = ({ Component, pageProps }) => {
  const handleRouteChangeStart = useCallback(() => {
    NProgress.start()
  }, [])

  const handleRouteChangeComplete = useCallback(() => {
    NProgress.done()
  }, [])

  const handleRouteChangeError = useCallback(() => {
    NProgress.done()
  }, [])

  useEffect(() => {
    Router.events.on('routeChangeStart', handleRouteChangeStart)
    Router.events.on('routeChangeComplete', handleRouteChangeComplete)
    Router.events.on('routeChangeError', handleRouteChangeError)

    return (): void => {
      Router.events.off('routeChangeStart', handleRouteChangeStart)
      Router.events.off('routeChangeComplete', handleRouteChangeComplete)
      Router.events.off('routeChangeError', handleRouteChangeError)
    }
  }, [
    handleRouteChangeStart,
    handleRouteChangeComplete,
    handleRouteChangeError
  ])

  return (
    <SWRConfig value={{ fetcher }}>
      <SiteProvider>
        <ThemeProvider>
          <Head>
            <meta content="width=device-width" name="viewport" />
            <meta content="#212121" name="theme-color" />

            <link href="https://fonts.googleapis.com" rel="preconnect" />
            <link href="https://fonts.gstatic.com" rel="preconnect" />
            <link href="https://www.googletagmanager.com" rel="preconnect" />
            <link href="https://www.google-analytics.com" rel="preconnect" />
            <link href="https://shinju-date.imgix.net" rel="preconnect" />
            <link
              href={favicon192x192}
              rel="icon"
              sizes="192x192"
              type="image/png"
            />
            <link
              href={favicon512x512}
              rel="icon"
              sizes="512x512"
              type="image/png"
            />
            <link
              href={appleTouchIcon}
              rel="apple-touch-icon"
              sizes="152x152"
              type="image/png"
            />
            <link href="/manifest.json" rel="manifest" />
            <link
              href="/opensearch.xml"
              rel="search"
              type="application/opensearchdescription+xml"
            />
            <link
              as="style"
              href="https://fonts.googleapis.com/css?display=swap&amp;family=Lato:300,400,500,700"
              rel="preload"
            />
          </Head>

          <Layout>
            <Component {...pageProps} />
          </Layout>

          <link
            href="https://fonts.googleapis.com/css?display=swap&amp;family=Lato:300,400,500,700"
            rel="stylesheet"
          />
        </ThemeProvider>
      </SiteProvider>
    </SWRConfig>
  )
}

export default MyApp
