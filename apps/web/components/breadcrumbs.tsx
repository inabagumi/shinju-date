import Link from "next/link";
import type { ReactNode } from "react";

import { SITE_NAME as siteName } from "@/lib/site";

export interface BreadcrumbItem {
  /** 省略すると現在のページとして、リンクにせずに表示する */
  href?: string | undefined;
  name: ReactNode;
}

interface BreadcrumbsProps {
  /** トップページより下の階層。トップページは自動で先頭に付く */
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const allItems: BreadcrumbItem[] = [{ href: "/", name: siteName }, ...items];

  return (
    <nav aria-label="パンくずリスト">
      <ol
        className="flex flex-wrap items-center gap-x-2 text-meta text-muted"
        itemScope
        itemType="https://schema.org/BreadcrumbList"
      >
        {allItems.map((item, index) => {
          const position = index + 1;
          const isCurrent = position === allItems.length;

          return (
            <li
              className="flex items-center gap-x-2 before:content-['/'] first:before:content-none"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
              key={position}
            >
              {item.href && !isCurrent ? (
                <Link
                  className="hover:text-accent hover:underline"
                  href={item.href}
                  itemProp="item"
                >
                  <span itemProp="name">{item.name}</span>
                </Link>
              ) : (
                <span aria-current={isCurrent ? "page" : undefined}>
                  <span itemProp="name">{item.name}</span>
                </span>
              )}
              <meta content={String(position)} itemProp="position" />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
