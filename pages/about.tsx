import { NextPage } from 'next'
import Head from 'next/head'
import React, { ReactElement } from 'react'
import { getTitle } from '../lib/title'

const About: NextPage = (): ReactElement => {
  const title = getTitle()
  const description = process.env.ANIMARE_SEARCH_DESCRIPTION

  return (
    <>
      <Head>
        <title>About - {title}</title>
      </Head>

      <main className="container margin-top--lg">
        <h1>あにまーれサーチとは?</h1>

        <p>{description}</p>
      </main>
    </>
  )
}

export default About
