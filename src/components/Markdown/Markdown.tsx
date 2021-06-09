import { MDXProvider } from '@mdx-js/react'
import clsx from 'clsx'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { NextSeo } from 'next-seo'
import type { FC } from 'react'

import Page from '@/components/Layout'

import styles from './Markdown.module.css'
import mdxProviderComponents from './mdxProviderComponents'

type Props = {
  title?: string
}

const About: FC<Props> = ({ children, title }) => {
  const router = useRouter()

  return (
    <>
      <NextSeo title={title} />

      <Page>
        {title && (
          <div className="hero hero--dark">
            <div className="container">
              <h1 className="hero__title">{title}</h1>
            </div>
          </div>
        )}

        <div className="container">
          <nav aria-label="パンくずリスト" className="margin-vert--md">
            <ul
              className="breadcrumbs breadcrumbs--sm"
              itemScope
              itemType="https://schema.org/BreadcrumbList"
            >
              <li
                className="breadcrumbs__item"
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
              >
                <Link href="/">
                  <a className="breadcrumbs__link" itemProp="item">
                    <span itemProp="name">SHINJU DATE</span>
                  </a>
                </Link>
                <meta itemProp="position" content="1" />
              </li>
              <li
                className="breadcrumbs__item breadcrumbs__item--active"
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
              >
                <Link href={router.pathname}>
                  <a
                    className="breadcrumbs__link"
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

          <div className={clsx('padding-bottom--lg', styles.markdown)}>
            <MDXProvider components={mdxProviderComponents}>
              {children}
            </MDXProvider>
          </div>
        </div>
      </Page>
    </>
  )
}

export default About
