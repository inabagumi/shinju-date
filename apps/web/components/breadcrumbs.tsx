'use client'

import { SITE_NAME as siteName } from '@shinju-date/constants'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export default function Breadcrumbs({
  title,
}: {
  title?: ReactNode | undefined
}) {
  const pathname = usePathname()

  return (
    <nav aria-label="パンくずリスト" className="p-4">
      <ul
        className="flex items-center text-sm"
        itemScope
        itemType="https://schema.org/BreadcrumbList"
      >
        <li
          className=""
          itemProp="itemListElement"
          itemScope
          itemType="https://schema.org/ListItem"
        >
          <Link
            className="hover:bg-774-nevy-200 rounded-full px-4 py-1 dark:hover:bg-zinc-600"
            href="/"
            itemProp="item"
          >
            <span itemProp="name">{siteName}</span>
          </Link>
          <meta content="1" itemProp="position" />
        </li>
        {pathname && (
          <li
            className="flex items-center before:block before:px-3 before:content-['/']"
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
          >
            <Link
              className="bg-774-nevy-100 hover:bg-774-nevy-200 rounded-full px-4 py-1 dark:bg-zinc-700 dark:hover:bg-zinc-600"
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
  )
}
