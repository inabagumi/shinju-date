import { MDXProvider, useMDXComponents } from '@mdx-js/react'
import { useRouter } from 'next/router'
import { NextSeo } from 'next-seo'
import Page from './layout'
import Link, { Props as LinkProps } from './link'
import type { FunctionComponent } from 'mdx/types'
import type { ReactNode, VFC } from 'react'

type Props = {
  children: ReactNode[]
  title?: string
}

const Markdown: VFC<Props> = ({ children, title }) => {
  const router = useRouter()
  const components = useMDXComponents({
    a: Link as FunctionComponent<LinkProps>
  })

  return (
    <>
      {title && <NextSeo title={title} />}

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
                <Link className="breadcrumbs__link" href="/" itemProp="item">
                  <span itemProp="name">SHINJU DATE</span>
                </Link>
                <meta itemProp="position" content="1" />
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
                <meta itemProp="position" content="2" />
              </li>
            </ul>
          </nav>

          <div className="markdown padding-bottom--lg">
            <MDXProvider components={components}>{children}</MDXProvider>
          </div>
        </div>
      </Page>
    </>
  )
}

export default Markdown
