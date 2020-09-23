import { MDXProvider } from '@mdx-js/react'
import clsx from 'clsx'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { FC } from 'react'

import Container from '@/components/atoms/Container'
import Hero, { HeroTitle } from '@/components/organisms/Hero'
import { useSiteMetadata } from '@/context/SiteContext'

import styles from './Markdown.module.css'
import mdxProviderComponents from './mdxProviderComponents'

type Props = {
  title?: string
}

const About: FC<Props> = ({ children, title }) => {
  const { title: siteTitle } = useSiteMetadata()
  const router = useRouter()

  return (
    <>
      <Head>
        <title>{[title, siteTitle].filter(Boolean).join(' - ')}</title>
      </Head>

      <Hero color="dark">
        <HeroTitle>{title ?? siteTitle}</HeroTitle>
      </Hero>

      <Container>
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
                {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                <a className="breadcrumbs__link" itemProp="item">
                  <span itemProp="name">{siteTitle}</span>
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
      </Container>
    </>
  )
}

export default About
