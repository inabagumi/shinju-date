import App, { Container } from 'next/app'
import Head from 'next/head'
import React from 'react'
import Header from '../components/organisms/header'

export default class extends App {
  render() {
    const { Component, pageProps } = this.props
    const { query } = pageProps

    return (
      <>
        <style jsx global>{`
          html,
          body,
          #__next {
            height: 100%;
          }

          body {
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

          .footer {
            background-color: #212121;
            color: #fafafa;
          }

          .copyright {
            font-size: 0.9rem;
            margin: 2rem 0.5rem;
            text-align: center;
          }

          .copyright a {
            color: inherit;
            text-decoration: none;
          }
        `}</style>

        <Head>
          <link href="/static/favicon.png" rel="icon" />
        </Head>

        <Container>
          <div className="wrapper">
            <Header query={query || ''} />

            <div className="content">
              <Component {...pageProps} />
            </div>

            <div className="footer">
              <p className="copyright">
                Copyright 2019{' '}
                <a
                  href="https://haneru.dev/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Haneru Developers
                </a>
              </p>
            </div>
          </div>
        </Container>
      </>
    )
  }
}
