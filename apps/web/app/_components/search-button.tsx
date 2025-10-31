'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function SearchButton() {
  const router = useRouter()
  const [isMac, setIsMac] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    setIsMac(
      typeof window !== 'undefined' &&
        navigator.userAgent.toUpperCase().includes('MAC'),
    )
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        router.push('/search')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  return (
    <Link
      aria-label="検索"
      className="flex w-full min-w-48 items-center gap-2 rounded-full border-0 bg-774-nevy-100 px-4 py-1.5 text-left text-774-nevy-300 hover:bg-774-nevy-200 hover:text-primary dark:bg-zinc-700 dark:text-774-nevy-100 dark:hover:bg-zinc-600 dark:hover:text-774-nevy-100"
      href="/search"
    >
      <svg
        aria-hidden="true"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <span className="flex-1">検索</span>
      {isMac !== undefined && (
        <kbd className="hidden rounded border border-774-nevy-200 bg-primary-foreground px-2 py-0.5 font-mono text-774-nevy-500 text-xs sm:inline-block dark:border-zinc-600 dark:bg-zinc-800 dark:text-774-nevy-300">
          {isMac ? '⌘' : 'Ctrl'}K
        </kbd>
      )}
    </Link>
  )
}
