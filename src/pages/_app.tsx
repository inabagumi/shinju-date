import { AppProps } from 'next/app'
import Head from 'next/head'
import React, { FC } from 'react'
import { SWRConfig } from 'swr'

import Header from 'components/organisms/header'
import { SiteProvider } from 'context/site-context'
import { ThemeProvider } from 'context/theme-context'

import 'infima/dist/css/default/default.css'
import 'react-toggle/style.css'

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  return res.json()
}

const MyApp: FC<AppProps> = ({ Component, pageProps }) => (
  <SWRConfig value={{ fetcher }}>
    <SiteProvider>
      <ThemeProvider>
        <Head>
          <meta content="width=device-width" name="viewport" />
          <meta content="#212121" name="theme-color" />

          <link href="/favicon.png" rel="icon" />
          <link href="/manifest.json" rel="manifest" />
          <link
            href="/opensearch.xml"
            rel="search"
            type="application/opensearchdescription+xml"
          />
        </Head>

        <Header />

        <main className="container">
          <Component {...pageProps} />
        </main>

        <style jsx global>{`
          :root {
            --ifm-font-family-base: Roboto, Noto Sans JP, sans-serif;
            --ifm-font-size-base: 16px;
            --ifm-line-height-base: 2;
          }

          .react-toggle--checked .react-toggle-thumb {
            border-color: var(--ifm-color-primary);
          }

          .react-toggle--focus .react-toggle-thumb {
            box-shadow: 0 0 2px 3px var(--ifm-color-primary);
          }

          .react-toggle:active:not(.react-toggle--disabled)
            .react-toggle-thumb {
            box-shadow: 0 0 5px 5px var(--ifm-color-primary);
          }
        `}</style>
      </ThemeProvider>
    </SiteProvider>
  </SWRConfig>
)

export default MyApp
