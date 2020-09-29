import Document, { Head, Html, Main, NextScript } from 'next/document'

import { appleTouchIcon, favicon192x192, favicon512x512 } from '@/assets'

export default class extends Document {
  render(): JSX.Element {
    return (
      <Html lang="ja">
        <Head>
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
        </Head>

        <body>
          <Main />

          <NextScript />
        </body>
      </Html>
    )
  }
}
