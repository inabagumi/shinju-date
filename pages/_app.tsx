import App, { Container } from 'next/app'
import Head from 'next/head'
import React, { ReactElement } from 'react'
import Header from '../components/organisms/header'
import { getTitle } from '../lib/title'

export default class extends App {
  public render(): ReactElement {
    const { Component, pageProps } = this.props
    const { query } = pageProps
    const title = getTitle()

    return (
      <>
        <Head>
          <meta content="#212121" name="theme-color" />

          <link href="/static/favicon.png" rel="icon" />
          <link href="/manifest.json" rel="manifest" />
          <link
            href="/opensearch.xml"
            rel="search"
            title={title}
            type="application/opensearchdescription+xml"
          />
        </Head>

        <Container>
          <Header query={query || ''} />

          <div className="content">
            <Component {...pageProps} />
          </div>
        </Container>

        <style jsx global>{`
          body {
            color: #212121;
            font-family: Roboto, Noto Sans JP, sans-serif;
            margin: 0;
          }
        `}</style>

        <style jsx>{`
          .content {
            margin-top: 60px;
          }
        `}</style>
      </>
    )
  }
}
