import Document, {
  DocumentContext,
  DocumentInitialProps,
  Head,
  Html,
  Main,
  NextScript
} from 'next/document'
import React, { ReactElement } from 'react'
import { Helmet, HelmetData } from 'react-helmet'

type Props = {
  helmet: HelmetData
}

export default class extends Document<Props> {
  public static async getInitialProps(
    ctx: DocumentContext
  ): Promise<DocumentInitialProps & Props> {
    const documentProps = await super.getInitialProps(ctx)

    if (typeof window === 'undefined') {
      await import('@formatjs/intl-relativetimeformat/polyfill-locales')
    }

    return {
      ...documentProps,
      helmet: Helmet.renderStatic()
    }
  }

  public render(): ReactElement {
    const { helmet } = this.props

    return (
      <Html {...helmet.htmlAttributes.toComponent()}>
        <Head>
          {helmet.title.toComponent()}
          {helmet.meta.toComponent()}
          {helmet.link.toComponent()}
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

        <body {...helmet.bodyAttributes.toComponent()}>
          <Main />

          <NextScript />

          <link
            href="https://fonts.googleapis.com/css?display=swap&amp;family=Roboto:300,400,500,700"
            rel="stylesheet"
          />
          <link
            href="https://fonts.googleapis.com/css?display=swap&amp;family=Noto+Sans+JP:300,400,500,700"
            rel="stylesheet"
          />
        </body>
      </Html>
    )
  }
}
