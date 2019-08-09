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

      <main className="content">
        <h2 className="title">あにまーれサーチとは?</h2>

        <p className="description">{description}</p>
      </main>

      <style jsx>{`
        .content {
          margin: 0 auto;
          max-width: 800px;
          padding: 2rem 0.5rem 0;
        }

        .title {
          font-size: 2rem;
          margin: 1rem 0 2rem 0.5rem;
        }

        .description {
          line-height: 2;
          margin: 0 0.5rem 1rem;
        }
      `}</style>
    </>
  )
}

export default About
