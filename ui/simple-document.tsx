'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'
import { SkipNavContent } from './skip-nav'

type Props = {
  button?: ReactNode
  children: ReactNode
  title?: ReactNode
  withBreadcrumbs?: boolean
}

export default function SimpleDocument({
  button,
  children,
  title,
  withBreadcrumbs = false
}: Props): JSX.Element {
  const pathname = usePathname()

  return (
    <>
      {title && (
        <div className="hero hero--dark">
          <div className="container">
            <h1 className="hero__title">{title}</h1>

            {button && <div>{button}</div>}
          </div>
        </div>
      )}

      <SkipNavContent>
        <main className="container">
          {withBreadcrumbs && (
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
                {pathname && (
                  <li
                    className="breadcrumbs__item breadcrumbs__item--active"
                    itemProp="itemListElement"
                    itemScope
                    itemType="https://schema.org/ListItem"
                  >
                    <Link
                      className="breadcrumbs__link"
                      href={pathname}
                      itemProp="item"
                    >
                      <span itemProp="name">{title || pathname}</span>
                    </Link>
                    <meta content="2" itemProp="position" />
                  </li>
                )}
              </ul>
            </nav>
          )}

          <div className="padding-bottom--lg">{children}</div>
        </main>
      </SkipNavContent>
    </>
  )
}
