'use client'

import { Button } from '@shinju-date/ui'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

interface Props {
  currentPage: number
  totalPages: number
}

export default function Pagination({ currentPage, totalPages }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Helper function to create URLs that preserve all current query parameters
  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    return `${pathname}?${params.toString()}`
  }
  const pages = []
  const maxPagesToShow = 5

  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2))
  const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1)

  if (endPage - startPage < maxPagesToShow - 1) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1)
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
  }

  return (
    <div className="flex items-center justify-center gap-2 p-4">
      {currentPage > 1 && (
        <Button asChild size="md" variant="secondary">
          <Link href={createPageUrl(currentPage - 1)}>前へ</Link>
        </Button>
      )}

      {startPage > 1 && (
        <>
          <Button asChild size="md" variant="secondary">
            <Link href={createPageUrl(1)}>1</Link>
          </Button>
          {startPage > 2 && <span className="px-2">...</span>}
        </>
      )}

      {pages.map((page) => (
        <Button
          asChild
          key={page}
          size="md"
          variant={page === currentPage ? 'primary' : 'secondary'}
        >
          <Link href={createPageUrl(page)}>{page}</Link>
        </Button>
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="px-2">...</span>}
          <Button asChild size="md" variant="secondary">
            <Link href={createPageUrl(totalPages)}>{totalPages}</Link>
          </Button>
        </>
      )}

      {currentPage < totalPages && (
        <Button asChild size="md" variant="secondary">
          <Link href={createPageUrl(currentPage + 1)}>次へ</Link>
        </Button>
      )}
    </div>
  )
}
