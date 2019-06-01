import App, { Container } from 'next/app'
import Head from 'next/head'
import Link from 'next/link'
import SearchForm from '../components/search-form'

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

          .header {
            border-bottom: 1px solid #e0e0e0;
          }

          .header__content {
            align-items: center;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            line-height: 1;
            margin: 0 auto;
            max-width: 1024px;
            padding: 0.5rem 1rem;
          }

          @media (min-width: 500px) {
            .header__content {
              flex-direction: row;
              justify-content: space-between;
            }
          }

          .title {
            font-size: 1.5rem;
            font-weight: 700;
            margin: 0 0 0.5rem 0;
            padding: 0;
          }

          @media (min-width: 500px) {
            .title {
              margin-bottom: 0;
              margin-right: 1rem;
            }
          }

          .title__link {
            color: inherit;
            text-decoration: none;
          }

          .content {
            flex-grow: 1;
          }

          .footer {
            background-color: #424242;
            color: #fafafa;
          }

          .copyright {
            font-size: 0.9rem;
            margin: 1rem 0.5rem;
            text-align: center;
          }

          .copyright a {
            color: inherit;
            text-decoration: none;
          }
        `}</style>

        <Head>
          <title>
            {query ? `${query} - あにまーれサーチ` : 'あにまーれサーチ'}
          </title>

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
        </Head>

        <Container>
          <div className="wrapper">
            <div className="header">
              <div className="header__content">
                <h1 className="title">
                  <Link href="/">
                    <a className="title__link" tabIndex={-1}>
                      あにまーれサーチ
                    </a>
                  </Link>
                </h1>

                <SearchForm query={query} />
              </div>
            </div>

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

          <link
            href="https://fonts.googleapis.com/css?display=swap&amp;family=Roboto:400,700"
            rel="stylesheet"
          />
          <link
            href="https://fonts.googleapis.com/css?display=swap&amp;family=Noto+Sans+JP:400,700"
            rel="stylesheet"
          />
        </Container>
      </>
    )
  }
}
