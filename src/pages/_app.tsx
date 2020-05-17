import { AppProps } from 'next/app'
import Head from 'next/head'
import React, { FC } from 'react'
import { SWRConfig } from 'swr'

import Footer from 'components/organisms/footer'
import Header from 'components/organisms/header'
import { SiteProvider } from 'context/site-context'
import { ThemeProvider } from 'context/theme-context'

import 'infima/dist/css/default/default.css'
import 'react-toggle/style.css'

import 'styles/global.css'

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

        <main style={{ flexBasis: 'auto', flexGrow: 1, flexShrink: 0 }}>
          <Component {...pageProps} />
        </main>

        <Footer />
      </ThemeProvider>
    </SiteProvider>
  </SWRConfig>
)

export default MyApp
