import { NextFC } from 'next'
import Head from 'next/head'
import React from 'react'

const Index: NextFC = () => {
  return (
    <>
      <Head>
        <link href="https://search.animare.cafe/" rel="canonical" />
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
