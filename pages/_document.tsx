import { Head, Html, Main, NextScript } from 'next/document'
import type { DocumentProps } from 'next/document'
import type { VFC } from 'react'

const Document: VFC<DocumentProps> = () => {
  return (
    <Html>
      <Head>
        <meta content="#212121" name="theme-color" />
        <link href="/manifest.json" rel="manifest" />
        <link
          href="/opensearch.xml"
          rel="search"
          type="application/opensearchdescription+xml"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?display=swap&amp;family=Lato%3Awght%40300%3B400%3B700"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}

export default Document
