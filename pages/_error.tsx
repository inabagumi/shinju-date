import Error from 'next/error'
import Head from 'next/head'
import React from 'react'
import { getTitle } from '../lib/title'

export default class extends Error {
  render() {
    const { statusCode } = this.props
    const title = getTitle()

    return (
      <>
        <Head>
          <title>エラー! - {title}</title>
        </Head>

        <div className="error">
          <h2 className="error__title">{statusCode}</h2>
        </div>

        <style jsx>{`
          .error {
            align-items: center;
            display: flex;
            height: 100%;
            justify-content: center;
          }

          .error__title {
            font-size: 5rem;
            font-weight: 700;
          }
        `}</style>
      </>
    )
  }
}
