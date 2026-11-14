'use client'

import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchModal } from './search-modal-context'

export function SearchButton() {
  const [isMac, setIsMac] = useState<boolean | undefined>(undefined)
  const { openModal } = useSearchModal()

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
        openModal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openModal])

  return (
    <button
      aria-label="検索"
      className="flex w-full min-w-0 items-center gap-2 rounded-full border border-774-nevy-300 bg-774-nevy-100 px-4 py-1.5 text-left text-774-nevy-800 transition-colors hover:border-774-nevy-400 hover:bg-774-nevy-200 hover:text-primary focus-visible:border-774-nevy-400 focus-visible:bg-774-nevy-200 focus-visible:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-774-nevy-700 active:bg-774-nevy-300 active:text-primary sm:min-w-48 dark:border-zinc-600 dark:bg-zinc-700 dark:text-774-nevy-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-600 dark:hover:text-774-nevy-50 dark:focus-visible:border-zinc-500 dark:focus-visible:bg-zinc-600 dark:focus-visible:text-774-nevy-50 dark:focus-visible:outline-774-nevy-300 dark:active:bg-zinc-800"
      onClick={openModal}
      type="button"
    >
      <Search aria-hidden="true" className="size-5 shrink-0" />
      <span className="flex-1">検索</span>
      {isMac !== undefined && (
        <kbd className="hidden rounded border border-774-nevy-300 bg-primary-foreground px-2 py-0.5 font-mono text-xs text-774-nevy-800 sm:inline-block dark:border-zinc-500 dark:bg-zinc-800 dark:text-774-nevy-200">
          {isMac ? '⌘' : 'Ctrl'}K
        </kbd>
      )}
    </button>
  )
}
