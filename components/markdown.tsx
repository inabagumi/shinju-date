import { MDXProvider } from '@mdx-js/react'
import { NextSeo } from 'next-seo'
import { useRouter } from 'next/router'
import Page from './layout'
import Link, { Props as LinkProps } from './link'
import type { FunctionComponent, MDXComponents } from 'mdx/types'
import type { ReactNode, VFC } from 'react'

const mdxComponents: MDXComponents = {
  a: Link as FunctionComponent<LinkProps>
}

type Props = {
  children: ReactNode
  title?: string
}

const Markdown: VFC<Props> = ({ children, title }) => {
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
      </div>
    </Page>
  )
}

export default Markdown
