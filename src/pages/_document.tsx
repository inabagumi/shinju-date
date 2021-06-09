import Document, { Head, Html, Main, NextScript } from 'next/document'

import { appleTouchIcon, favicon192x192, favicon512x512 } from '@/assets'

export default class MyDocument extends Document {
  render(): JSX.Element {
    return (
      <Html lang="ja">
        <Head>
          <meta content="#212121" name="theme-color" />
          <link href="https://fonts.googleapis.com" rel="preconnect" />
          <link href="https://fonts.gstatic.com" rel="preconnect" />
          <link href="https://www.googletagmanager.com" rel="preconnect" />
          <link href="https://www.google-analytics.com" rel="preconnect" />
          <link
            as="style"
            href="https://fonts.googleapis.com/css2?display=swap&amp;family=Lato%3Awght%40300%3B400%3B700"
            rel="preload"
          />
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
          <link href="/manifest.json" rel="manifest" />
          <link
            href="/opensearch.xml"
            rel="search"
            type="application/opensearchdescription+xml"
          />
          <link
            href="https://fonts.googleapis.com/css2?display=swap&amp;family=Lato%3Awght%40300%3B400%3B700"
            rel="stylesheet"
          />
          {process.env.NEXT_PUBLIC_GA_TRACKING_ID && (
            <>
              <script
                async
                src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_TRACKING_ID}`}
              />
              <script
                dangerouslySetInnerHTML={{
                  __html: [
                    'window.dataLayer = window.dataLayer || [];',
                    'function gtag(){dataLayer.push(arguments);}',
                    "gtag('js', new Date());",
                    `gtag('config', '${process.env.NEXT_PUBLIC_GA_TRACKING_ID}');`
                  ].join('')
                }}
              />
            </>
          )}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}
