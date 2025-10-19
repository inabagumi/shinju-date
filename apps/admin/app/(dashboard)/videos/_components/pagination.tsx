import Link from 'next/link'

type Props = {
  currentPage: number
  totalPages: number
}

export default function Pagination({ currentPage, totalPages }: Props) {
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
        <Link
          className="rounded-md border border-gray-300 px-3 py-2 hover:bg-gray-100"
          href={`/videos?page=${currentPage - 1}`}
        >
          前へ
        </Link>
      )}

      {startPage > 1 && (
        <>
          <Link
            className="rounded-md border border-gray-300 px-3 py-2 hover:bg-gray-100"
            href="/videos?page=1"
          >
            1
          </Link>
          {startPage > 2 && <span className="px-2">...</span>}
        </>
      )}

      {pages.map((page) => (
        <Link
          className={`rounded-md border px-3 py-2 ${
            page === currentPage
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-gray-300 hover:bg-gray-100'
          }`}
          href={`/videos?page=${page}`}
          key={page}
        >
          {page}
        </Link>
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="px-2">...</span>}
          <Link
            className="rounded-md border border-gray-300 px-3 py-2 hover:bg-gray-100"
            href={`/videos?page=${totalPages}`}
          >
            {totalPages}
          </Link>
        </>
      )}

      {currentPage < totalPages && (
        <Link
          className="rounded-md border border-gray-300 px-3 py-2 hover:bg-gray-100"
          href={`/videos?page=${currentPage + 1}`}
        >
          次へ
        </Link>
      )}
    </div>
  )
}
