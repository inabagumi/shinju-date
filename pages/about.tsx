import { NextPage } from 'next'
import React, { ReactElement } from 'react'
import { Helmet } from 'react-helmet'
import { getTitle } from '../lib/title'

const About: NextPage = (): ReactElement => {
  const title = getTitle()
  const description = process.env.ANIMARE_SEARCH_DESCRIPTION

  return (
    <>
      <Helmet>
        <title>{`${title}とは?`}</title>
      </Helmet>

      <main className="container margin-top--lg">
        <h1>{title}とは?</h1>

        <p>{description}</p>
      </main>
    </>
  )
}

export default About
