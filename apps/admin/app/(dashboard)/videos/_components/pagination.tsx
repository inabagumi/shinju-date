"use client";

import { Button } from "@shinju-date/ui";
import Link from "next/link";

import { useSearchParamsHref } from "@/lib/use-update-search-params";

interface Props {
  currentPage: number;
  totalPages: number;
}

export default function Pagination({ currentPage, totalPages }: Props) {
  const createHref = useSearchParamsHref();

  // Keep the current query parameters other than `page`
  const createPageUrl = (page: number) =>
    createHref({ page: page.toString() }, { resetPage: false });
  const pages = [];
  const maxPagesToShow = 5;

  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  if (endPage - startPage < maxPagesToShow - 1) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  for (let i = startPage; i <= endPage; i += 1) {
    pages.push(i);
  }

  return (
    <nav
      aria-label="ページ送り"
      className="flex flex-wrap items-center justify-center gap-2 p-4 tabular-nums"
    >
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
          {startPage > 2 && <span className="px-2 text-muted">…</span>}
        </>
      )}

      {pages.map((page) => (
        <Button
          asChild
          key={page}
          size="md"
          variant={page === currentPage ? "primary" : "secondary"}
        >
          <Link
            aria-current={page === currentPage ? "page" : undefined}
            href={createPageUrl(page)}
          >
            {page}
          </Link>
        </Button>
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && (
            <span className="px-2 text-muted">…</span>
          )}
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
    </nav>
  );
}
