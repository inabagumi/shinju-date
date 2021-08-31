import { Head, Html, Main, NextScript } from 'next/document'
import type { VFC } from 'react'

const Document: VFC = (): JSX.Element => {
  return (
    <Html lang="ja">
      <Head>
        <meta content="#212121" name="theme-color" />
        <link href="https://fonts.gstatic.com" rel="preconnect" />
        <link href="https://www.googletagmanager.com" rel="preconnect" />
        <link href="https://www.google-analytics.com" rel="preconnect" />
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

export default Document
