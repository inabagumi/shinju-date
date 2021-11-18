import '../styles/global.css'
import { DefaultSeo } from 'next-seo'
import { ThemeProvider } from 'next-themes'
import Head from 'next/head'
import Script from 'next/script'
import { useCallback, useEffect } from 'react'
import { IntlProvider } from 'react-intl'
import aa from 'search-insights'
import { SWRConfig } from 'swr'
import appleTouchIcon from '../assets/apple-touch-icon.png'
import favicon192x192 from '../assets/favicon-192x192.png'
import favicon512x512 from '../assets/favicon-512x512.png'
import shareCard from '../assets/share-card.jpg'
import ProgressBar from '../components/progress-bar'
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
    aa('init', {
      apiKey: process.env.NEXT_PUBLIC_ALGOLIA_API_KEY,
      appId: process.env.NEXT_PUBLIC_ALGOLIA_APPLICATION_ID,
      useCookie: true
    })
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
      timeZone="Asia/Tokyo"
    >
      <SWRConfig>
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
                id="gtag-init"
                strategy="afterInteractive"
              />
            </>
          )}

          <DefaultSeo
            description={process.env.NEXT_PUBLIC_DESCRIPTION}
            openGraph={{
              images: [
                {
                  height: shareCard.height,
                  url: new URL(
                    shareCard.src,
                    process.env.NEXT_PUBLIC_BASE_URL
                  ).toString(),
                  width: shareCard.width
                }
              ],
              type: 'website'
            }}
            titleTemplate="%s - SHINJU DATE"
            twitter={{
              cardType: 'summary_large_image'
            }}
          />
          <ProgressBar options={{ showSpinner: false }} />
          <Component {...pageProps} />
        </ThemeProvider>
      </SWRConfig>
    </IntlProvider>
  )
}

export default MyApp
