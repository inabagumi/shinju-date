import Error from 'next/error'
import Head from 'next/head'
import React, { ReactElement } from 'react'

export default class extends Error {
  public render(): ReactElement {
    const { statusCode } = this.props

    return (
      <>
        <Head>
          <title>エラー!</title>
        </Head>

        <div className="container margin-top--lg">
          <h1>{statusCode}</h1>
        </div>
      </>
    )
  }
}
