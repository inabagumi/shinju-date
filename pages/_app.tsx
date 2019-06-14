import App, { Container } from 'next/app'
import Head from 'next/head'
import React from 'react'
import Footer from '../components/organisms/footer'
import Header from '../components/organisms/header'
import { getTitle } from '../lib/title'

export default class extends App {
  render() {
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
          <div className="wrapper">
            <Header query={query || ''} />

            <div className="content">
              <Component {...pageProps} />
            </div>

            <Footer />
          </div>
        </Container>

        <style jsx global>{`
          html,
          body,
          #__next {
            height: 100%;
          }

          body {
            color: #212121;
            font-family: Roboto, Noto Sans JP, sans-serif;
            margin: 0;
          }
        `}</style>

        <style jsx>{`
          .wrapper {
            display: flex;
            flex-direction: column;
            height: 100%;
          }

          .content {
            flex-grow: 1;
          }
        `}</style>
      </>
    )
  }
}
