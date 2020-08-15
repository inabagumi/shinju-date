import Document, { Head, Html, Main, NextScript } from 'next/document'
import React from 'react'

export default class extends Document {
  render(): JSX.Element {
    return (
      <Html lang="ja">
        <Head>
          <link
            href="https://fonts.googleapis.com/css?display=swap&amp;family=Lato:300,400,500,700"
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
}
