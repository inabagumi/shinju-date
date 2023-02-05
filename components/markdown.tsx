import { MDXProvider } from '@mdx-js/react'
import { SkipNavContent } from '@reach/skip-nav'
import { type FunctionComponent, type MDXComponents } from 'mdx/types'
import { useRouter } from 'next/router'
import { NextSeo } from 'next-seo'
import { type FC, type ReactNode } from 'react'
import Page, { DEFAULT_SKIP_NAV_CONTENT_ID } from './layout'
import Link, { Props as LinkProps } from './link'

const mdxComponents: MDXComponents = {
  a: Link as FunctionComponent<LinkProps>
}

type Props = {
  children: ReactNode
  title?: string
}

const Markdown: FC<Props> = ({ children, title }) => {
  const router = useRouter()

  return (
    <Page>
      {title && <NextSeo title={title} />}

      {title && (
        <div className="hero hero--dark">
          <div className="container">
            <h1 className="hero__title">{title}</h1>
          </div>
        </div>
      )}

      <SkipNavContent
        as="main"
        className="container"
        id={DEFAULT_SKIP_NAV_CONTENT_ID}
      >
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
              <Link className="breadcrumbs__link" href="/" itemProp="item">
                <span itemProp="name">SHINJU DATE</span>
              </Link>
              <meta content="1" itemProp="position" />
            </li>
            <li
              className="breadcrumbs__item breadcrumbs__item--active"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              <Link
                className="breadcrumbs__link"
                href={router.pathname}
                itemProp="item"
              >
                <span itemProp="name">{title || router.pathname}</span>
              </Link>
              <meta content="2" itemProp="position" />
            </li>
          </ul>
        </nav>

        <div className="markdown padding-bottom--lg">
          <MDXProvider components={mdxComponents}>{children}</MDXProvider>
        </div>
      </SkipNavContent>
    </Page>
  )
}

export default Markdown
