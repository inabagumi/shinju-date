import { NextFC } from 'next'
import Head from 'next/head'
import React from 'react'

const Index: NextFC = () => {
  return (
    <>
      <Head>
        <title>AniMare Search</title>
      </Head>
    </>
  )
}

Index.getInitialProps = async () => {
  return {
    query: ''
  }
}

export default Index
