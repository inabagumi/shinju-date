import { NextPage } from 'next'
import React, { ReactElement } from 'react'

const Contact: NextPage = (): ReactElement => {
  const formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLScZpHj8bihvn6dg8CF09aSCW9og11Lra-tMXeTBcr_ul-0fUw/viewform?embedded=true'

  return (
    <>
      <div className="container margin-top--lg">
        <iframe className="embedded-form" src={formUrl}>
          読み込んでいます…
        </iframe>
      </div>

      <style jsx>{`
        .embedded-form {
          border: 0;
          display: block;
          height: 799px;
          margin: 0 auto;
          max-width: 100%;
          width: 640px;
        }
      `}</style>
    </>
  )
}

export default Contact
