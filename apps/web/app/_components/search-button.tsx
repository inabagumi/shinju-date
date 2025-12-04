'use client'

import { Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

// Custom event to trigger modal open
const SEARCH_MODAL_EVENT = 'openSearchModal'

export function SearchButton() {
  const [isMac, setIsMac] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    setIsMac(
      typeof window !== 'undefined' &&
        navigator.userAgent.toUpperCase().includes('MAC'),
    )
  }, [])

  const openSearchModal = useCallback(() => {
    window.dispatchEvent(new CustomEvent(SEARCH_MODAL_EVENT))
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        openSearchModal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openSearchModal])

  return (
    <button
      aria-label="検索"
      className="flex w-full min-w-48 items-center gap-2 rounded-full border-0 bg-774-nevy-100 px-4 py-1.5 text-left text-774-nevy-300 hover:bg-774-nevy-200 hover:text-primary dark:bg-zinc-700 dark:text-774-nevy-100 dark:hover:bg-zinc-600 dark:hover:text-774-nevy-100"
      onClick={openSearchModal}
      type="button"
    >
      <Search className="size-5" />
      <span className="flex-1">検索</span>
      {isMac !== undefined && (
        <kbd className="hidden rounded border border-774-nevy-200 bg-primary-foreground px-2 py-0.5 font-mono text-774-nevy-500 text-xs sm:inline-block dark:border-zinc-600 dark:bg-zinc-800 dark:text-774-nevy-300">
          {isMac ? '⌘' : 'Ctrl'}K
        </kbd>
      )}
    </button>
  )
}
