import Document, { Head, Html, Main, NextScript } from 'next/document'
import React, { ReactElement } from 'react'

export default class extends Document {
  public render(): ReactElement {
    return (
      <Html lang="ja">
        <Head>
          <link
            as="style"
            href="https://fonts.googleapis.com/css?display=swap&amp;family=Roboto:300,400,500,700"
            rel="preload"
          />
          <link
            as="style"
            href="https://fonts.googleapis.com/css?display=swap&amp;family=Noto+Sans+JP:300,400,500,700"
            rel="preload"
          />
        </Head>

        <body>
          <Main />

          <link
            href="https://fonts.googleapis.com/css?display=swap&amp;family=Roboto:300,400,500,700"
            rel="stylesheet"
          />
          <link
            href="https://fonts.googleapis.com/css?display=swap&amp;family=Noto+Sans+JP:300,400,500,700"
            rel="stylesheet"
          />

          <NextScript />
        </body>
      </Html>
    )
  }
}
