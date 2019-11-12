import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React, { FC, ReactElement, useContext } from 'react'
import { SiteContext } from '../context/site-context'

type Props = {
  title?: string
}

const About: FC<Props> = ({ children, title }): ReactElement => {
  const { title: siteTitle } = useContext(SiteContext)
  const router = useRouter()

  return (
    <>
      <Head>
        <title>{title ? [title, siteTitle].join(' - ') : siteTitle}</title>
      </Head>

      <nav aria-label="パンくずリスト" className="margin-vert--md">
        <ul className="breadcrumbs breadcrumbs--sm">
          <li className="breadcrumb__item">
            <Link href="/">
              <a className="breadcrumb__link" href="/">
                {siteTitle}
              </a>
            </Link>
          </li>
          <li className="breadcrumb__item breadcrumb__item--active">
            <Link href={router.pathname}>
              <a className="breadcrumb__link" href={router.pathname}>
                {title || router.pathname}
              </a>
            </Link>
          </li>
        </ul>
      </nav>

      <div className="markdown padding-bottom--lg">
        {title && <h1>{title}</h1>}

        {children}
      </div>

      <style jsx>{`
        .markdown :global(ol ol),
        .markdown :global(ul ol) {
          list-style-type: decimal;
        }
      `}</style>
    </>
  )
}

export default About
