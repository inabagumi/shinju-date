import Document, { Head, Html, Main, NextScript } from 'next/document'
import React from 'react'

export default class extends Document {
  render() {
    return (
      <Html lang="ja">
        <Head>
          <link
            as="style"
            href="https://fonts.googleapis.com/css?display=swap&amp;family=Roboto:400,700"
            rel="preload"
          />
          <link
            as="style"
            href="https://fonts.googleapis.com/css?display=swap&amp;family=Noto+Sans+JP:400,700"
            rel="preload"
          />
          <link
            as="script"
            href="https://polyfill.io/v3/polyfill.min.js?features=IntersectionObserver"
            rel="preload"
          />
          <link
            href="https://fonts.googleapis.com/css?display=swap&amp;family=Material+Icons"
            rel="stylesheet"
          />
        </Head>

        <body>
          <Main />

          <link
            href="https://fonts.googleapis.com/css?display=swap&amp;family=Roboto:400,700"
            rel="stylesheet"
          />
          <link
            href="https://fonts.googleapis.com/css?display=swap&amp;family=Noto+Sans+JP:400,700"
            rel="stylesheet"
          />
          <script src="https://polyfill.io/v3/polyfill.min.js?features=IntersectionObserver" />

          <NextScript />
        </body>
      </Html>
    )
  }
}
