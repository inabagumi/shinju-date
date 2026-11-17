import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

interface BackLinkProps {
  children: ReactNode
  href: string
}

/**
 * 詳細ページの上に置く、一覧へ戻るリンク。
 */
export function BackLink({ children, href }: BackLinkProps) {
  return (
    <Link
      className="inline-flex items-center gap-1 rounded-control text-meta text-accent focus-ring hover:underline"
      href={href}
    >
      <ChevronLeft aria-hidden="true" className="size-4" />
      {children}
    </Link>
  )
}
