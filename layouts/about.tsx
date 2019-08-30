import React, { FC, ReactElement } from 'react'
import { Helmet } from 'react-helmet'
import Footer from '../components/organisms/footer'

type Props = {
  subtitle?: string
  title?: string
  withFooter?: boolean
}

const About: FC<Props> = ({
  children,
  subtitle,
  title,
  withFooter = false
}): ReactElement => {
  return (
    <>
      <Helmet>{title && <title>{title}</title>}</Helmet>

      {title && (
        <div className="hero hero--dark">
          <div className="container">
            <h1 className="hero__title">{title}</h1>

            {subtitle && <p className="hero__subtitle">{subtitle}</p>}
          </div>
        </div>
      )}

      <div className="container margin-top--lg">{children}</div>

      {withFooter && <Footer />}

      <style jsx>{`
        .hero__title {
          letter-spacing: 0.25rem;
          word-break: keep-all;
        }

        .container :global(ol ol),
        .container :global(ul ol) {
          list-style-type: decimal;
        }
      `}</style>
    </>
  )
}

export default About
