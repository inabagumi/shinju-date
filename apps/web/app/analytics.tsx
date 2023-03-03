'use client'

import { Analytics as VercelAnalytics } from '@vercel/analytics/react'
import dedent from 'dedent'
import { usePathname, useSearchParams } from 'next/navigation'
import Script from 'next/script'
import { Suspense, useEffect } from 'react'

type GoogleAnalyticsProps = {
  trackingID: string
}

export function GoogleAnalytics({
  trackingID
}: GoogleAnalyticsProps): JSX.Element {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    gtag('config', trackingID, {
      page_location: [pathname, searchParams.toString()]
        .filter(Boolean)
        .join('?'),
      page_title: document.title
    })
  }, [trackingID, pathname, searchParams])

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
  return (
    <>
      {process.env.NEXT_PUBLIC_GA_TRACKING_ID && (
        <Suspense>
          <GoogleAnalytics
            trackingID={process.env.NEXT_PUBLIC_GA_TRACKING_ID}
          />
        </Suspense>
      )}
      <VercelAnalytics />
    </>
  )
}
