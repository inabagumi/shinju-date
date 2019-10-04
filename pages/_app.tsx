import classNames from 'classnames'
import App from 'next/app'
import Link from 'next/link'
import React, { ReactElement } from 'react'
import { Helmet } from 'react-helmet'
import Header from '../components/organisms/header'
import { getTitle } from '../lib/title'

import 'infima/dist/css/default/default.css'

export default class extends App {
  public render(): ReactElement {
    const { Component, pageProps, router } = this.props
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

        <Header query={query || ''} />

        <div className="container">
          <div className="row">
            <main className="col">
              <Component {...pageProps} />
            </main>

            <div className="col col--2">
              <div className="sidebar padding-vert--sm">
                <div className="menu">
                  <ul className="menu__list">
                    <li className="menu__list-item">
                      <Link href="/about">
                        <a
                          className={classNames('menu__link', {
                            'menu__link--active': router.pathname === '/about'
                          })}
                          href="/about"
                        >
                          あにまーれサーチとは
                        </a>
                      </Link>
                    </li>
                    <li className="menu__list-item">
                      <Link href="/terms">
                        <a
                          className={classNames('menu__link', {
                            'menu__link--active': router.pathname === '/terms'
                          })}
                          href="/terms"
                        >
                          利用規約
                        </a>
                      </Link>
                    </li>
                    <li className="menu__list-item">
                      <Link href="/privacy">
                        <a
                          className={classNames('menu__link', {
                            'menu__link--active': router.pathname === '/privacy'
                          })}
                          href="/privacy"
                        >
                          プライバシーポリシー
                        </a>
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style jsx global>{`
          :root {
            --ifm-container-width: 1240px;
            --ifm-font-family-base: Roboto, Noto Sans JP, sans-serif;
            --ifm-font-size-base: 16px;
            --ifm-line-height-base: 2;
          }

          body {
            padding-top: 60px;
          }
        `}</style>

        <style jsx>{`
          .sidebar {
            display: flex;
            flex-direction: column;
            height: calc(100vh - var(--ifm-navbar-height));
            justify-content: flex-end;
            overflow-y: auto;
            position: sticky;
            top: var(--ifm-navbar-height);
          }

          @media (max-width: 996px) {
            .sidebar {
              display: none;
            }
          }

          .menu__link {
            font-size: 0.85rem;
          }
        `}</style>
      </>
    )
  }
}
