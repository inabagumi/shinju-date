import App, { Container } from 'next/app'
import React, { ReactElement } from 'react'
import { Helmet } from 'react-helmet'
import Header from '../components/organisms/header'
import { getTitle } from '../lib/title'

import 'infima/dist/css/default/default.css'

export default class extends App {
  public render(): ReactElement {
    const { Component, pageProps } = this.props
    const { query } = pageProps
    const title = getTitle()

    return (
      <>
        <Helmet defaultTitle={title} titleTemplate={`%s - ${title}`}>
          <meta
            content="initial-scale=1,minimum-scale=1,user-scalable=no,width=device-width"
            name="viewport"
          />
          <meta content="#212121" name="theme-color" />

          <link href="/static/favicon.png" rel="icon" />
          <link href="/manifest.json" rel="manifest" />
          <link
            href="/opensearch.xml"
            rel="search"
            title={title}
            type="application/opensearchdescription+xml"
          />
        </Helmet>

        <Container>
          <Header query={query || ''} />

          <Component {...pageProps} />
        </Container>

        <style jsx global>{`
          :root {
            --ifm-font-family-base: Roboto, Noto Sans JP, sans-serif;
            --ifm-font-size-base: 16px;
            --ifm-line-height-base: 2;
          }

          body {
            padding-top: 60px;
          }
        `}</style>
      </>
    )
  }
}
