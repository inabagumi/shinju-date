import '../styles/global.css'
import Head from 'next/head'
import Script from 'next/script'
import { DefaultSeo } from 'next-seo'
import { ThemeProvider } from 'next-themes'
import { useCallback, useEffect } from 'react'
import { IntlProvider } from 'react-intl'
import { SWRConfig } from 'swr'
import appleTouchIcon from '../assets/apple-touch-icon.png'
import favicon192x192 from '../assets/favicon-192x192.png'
import favicon512x512 from '../assets/favicon-512x512.png'
import ProgressBar from '../components/progress-bar'
import fetcher from '../utils/fetcher'
import type { AppProps } from 'next/app'
import type { VFC } from 'react'

const MyApp: VFC<AppProps> = ({ Component, pageProps, router }) => {
  const handleRouterChangeComplete = useCallback((url: string) => {
    const trackingID = process.env.NEXT_PUBLIC_GA_TRACKING_ID

    if (trackingID) {
      gtag('config', trackingID, {
        page_location: url,
        page_title: document.title
      })
    }
  }, [])

  useEffect(() => {
    router.events.on('routeChangeComplete', handleRouterChangeComplete)

    return () => {
      router.events.off('routeChangeComplete', handleRouterChangeComplete)
    }
  }, [router.events, handleRouterChangeComplete])

  return (
    <IntlProvider
      defaultLocale={router.defaultLocale}
      locale={router.locale ?? 'en'}
    >
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

          {process.env.NEXT_PUBLIC_GA_TRACKING_ID && (
            <>
              <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_TRACKING_ID}`}
                strategy="afterInteractive"
              />
              <Script
                id="gtag-init"
                dangerouslySetInnerHTML={{
                  __html: `
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());

                    gtag('config', '${process.env.NEXT_PUBLIC_GA_TRACKING_ID}', {
                      page_path: window.location.pathname
                    });
                  `
                }}
                strategy="afterInteractive"
              />
            </>
          )}

          <DefaultSeo titleTemplate="%s - SHINJU DATE" />
          <ProgressBar options={{ showSpinner: false }} />
          <Component {...pageProps} />
        </ThemeProvider>
      </SWRConfig>
    </IntlProvider>
  )
}

export default MyApp
