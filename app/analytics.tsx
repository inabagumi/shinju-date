'use client'

import { Analytics as VercelAnalytics } from '@vercel/analytics/react'
import dedent from 'dedent'
import { usePathname, useSearchParams } from 'next/navigation'
import Script from 'next/script'
import { Suspense, useEffect } from 'react'
import aa from 'search-insights'

export function GoogleAnalytics(): JSX.Element {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const trackingID = process.env.NEXT_PUBLIC_GA_TRACKING_ID

  useEffect(() => {
    if (!trackingID || !pathname || !searchParams) {
      return
    }

    gtag('config', trackingID, {
      page_location: [pathname, searchParams.toString()]
        .filter(Boolean)
        .join('?'),
      page_title: document.title
    })
  }, [trackingID, pathname, searchParams])

  if (!trackingID) {
    return <></>
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${trackingID}`}
        strategy="afterInteractive"
      />
      <Script
        dangerouslySetInnerHTML={{
          __html: dedent`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${trackingID}', {
              page_path: window.location.pathname
            });
          `
        }}
        id="gtag-init"
        strategy="afterInteractive"
      />
    </>
  )
}

export default function Analytics(): JSX.Element {
  useEffect(() => {
    aa('init', {
      apiKey: process.env.NEXT_PUBLIC_ALGOLIA_API_KEY,
      appId: process.env.NEXT_PUBLIC_ALGOLIA_APPLICATION_ID,
      useCookie: true
    })
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        <GoogleAnalytics />
      </Suspense>
      <VercelAnalytics />
    </>
  )
}
