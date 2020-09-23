import Document, { Head, Html, Main, NextScript } from 'next/document'

export default class extends Document {
  render(): JSX.Element {
    return (
      <Html lang="ja">
        <Head>
          <link
            href="https://fonts.googleapis.com/css2?display=swap&amp;family=Lato%3Awght%40300%3B400%3B700"
            rel="preload"
          />
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
}
