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
        <ul
          className="breadcrumbs breadcrumbs--sm"
          itemScope
          itemType="https://schema.org/BreadcrumbList"
        >
          <li
            className="breadcrumb__item"
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
          >
            <Link href="/">
              <a className="breadcrumb__link" href="/" itemProp="item">
                <span itemProp="name">{siteTitle}</span>
              </a>
            </Link>
            <meta itemProp="position" content="1" />
          </li>
          <li
            className="breadcrumb__item breadcrumb__item--active"
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
          >
            <Link href={router.pathname}>
              <a
                className="breadcrumb__link"
                href={router.pathname}
                itemProp="item"
              >
                <span itemProp="name">{title || router.pathname}</span>
              </a>
            </Link>
            <meta itemProp="position" content="2" />
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
