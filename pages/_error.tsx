import Error from 'next/error'
import Head from 'next/head'
import React, { ReactElement } from 'react'
import { getTitle } from '../lib/title'

export default class extends Error {
  public render(): ReactElement {
    const { statusCode } = this.props
    const title = getTitle()

    return (
      <>
        <Head>
          <title>エラー! - {title}</title>
        </Head>

        <div className="container margin-top--lg">
          <h1>{statusCode}</h1>
        </div>
      </>
    )
  }
}
