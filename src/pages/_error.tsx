import Error from 'next/error'
import React, { ReactElement } from 'react'
import { Helmet } from 'react-helmet'

export default class extends Error {
  public render(): ReactElement {
    const { statusCode } = this.props

    return (
      <>
        <Helmet>
          <title>エラー!</title>
        </Helmet>

        <div className="container margin-top--lg">
          <h1>{statusCode}</h1>
        </div>
      </>
    )
  }
}
