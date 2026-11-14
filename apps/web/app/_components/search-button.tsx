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
      className="bg-774-nevy-100 text-774-nevy-300 hover:bg-774-nevy-200 hover:text-primary dark:text-774-nevy-100 dark:hover:text-774-nevy-100 flex w-full min-w-48 items-center gap-2 rounded-full border-0 px-4 py-1.5 text-left dark:bg-zinc-700 dark:hover:bg-zinc-600"
      onClick={openModal}
      type="button"
    >
      <Search className="size-5" />
      <span className="flex-1">検索</span>
      {isMac !== undefined && (
        <kbd className="border-774-nevy-200 bg-primary-foreground text-774-nevy-500 dark:text-774-nevy-300 hidden rounded border px-2 py-0.5 font-mono text-xs sm:inline-block dark:border-zinc-600 dark:bg-zinc-800">
          {isMac ? '⌘' : 'Ctrl'}K
        </kbd>
      )}
    </button>
  )
}
