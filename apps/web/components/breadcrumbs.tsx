'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'
import { title as siteName } from '@/lib/constants'

export default function Breadcrumbs({
  title
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
            className="rounded-full py-1 px-4 hover:bg-774-nevy-200 dark:hover:bg-zinc-600"
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
              className="rounded-full bg-zinc-700 py-1 px-4 hover:bg-zinc-600"
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
