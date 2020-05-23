import Document, { Head, Html, Main, NextScript } from 'next/document'
import React from 'react'

export default class extends Document {
  render(): JSX.Element {
    return (
      <Html lang="ja">
        <Head />

        <body>
          <Main />

          <NextScript />
        </body>
      </Html>
    )
  }
}
