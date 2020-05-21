import 'infima/dist/css/default/default.css'
import 'nprogress/css/nprogress.css'
import 'react-toggle/style.css'

import '@/styles/global.css'

import { SWRConfig } from '@ykzts/swr'
import { AppProps } from 'next/app'
import Head from 'next/head'
import Router from 'next/router'
import NProgress from 'nprogress'
import React, { FC, useCallback, useEffect } from 'react'

import { appleTouchIcon, favicon192x192, favicon512x512 } from '@/assets'
import Footer from '@/components/organisms/Footer'
import Header from '@/components/organisms/Header'
import { SiteProvider } from '@/context/SiteContext'
import { ThemeProvider } from '@/context/ThemeContext'
import styles from '@/styles/app.module.css'

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  return res.json()
}

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
          </Head>

          <Header />

          <main className={styles.wrapper}>
            <Component {...pageProps} />
          </main>

          <Footer />
        </ThemeProvider>
      </SiteProvider>
    </SWRConfig>
  )
}

export default MyApp
