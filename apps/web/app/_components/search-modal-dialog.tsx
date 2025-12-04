'use client'

import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@shinju-date/ui'
import { Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { fetchSuggestions, type Suggestion } from '@/app/_lib/actions'

// Custom event to trigger modal open
const SEARCH_MODAL_EVENT = 'openSearchModal'

export function SearchModalDialog() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  // Listen for custom event to open modal
  useEffect(() => {
    const handleOpenModal = () => setIsOpen(true)
    window.addEventListener(SEARCH_MODAL_EVENT, handleOpenModal)
    return () => window.removeEventListener(SEARCH_MODAL_EVENT, handleOpenModal)
  }, [])

  const handleClose = useCallback((open: boolean) => {
    if (!open) {
      setIsOpen(false)
    }
  }, [])

  return (
    <Dialog onOpenChange={handleClose} open={isOpen}>
      <DialogPortal>
        <DialogOverlay className="z-50 backdrop-blur-sm" />

        <DialogContent className="data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[20%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[20%] top-[20%] left-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-20%] rounded-xl border-774-nevy-200 bg-primary-foreground p-0 shadow-2xl sm:max-w-3xl dark:border-zinc-700 dark:bg-zinc-900">
          <Suspense
            fallback={
              <div className="flex h-96 items-center justify-center">
                <div>Loading...</div>
              </div>
            }
          >
            <SearchModalContent onClose={() => handleClose(false)} />
          </Suspense>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

function SearchModalContent({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)

  // Fetch suggestions when query changes
  useEffect(() => {
    if (!query) {
      setSuggestions(null)
      setIsLoadingSuggestions(false)
      return
    }

    setIsLoadingSuggestions(true)

    const getSuggestions = async () => {
      try {
        const data = await fetchSuggestions(query)
        setSuggestions(data)
      } catch (err) {
        console.error('Failed to fetch suggestions', err)
        setSuggestions([])
      } finally {
        setIsLoadingSuggestions(false)
      }
    }

    // Debounce the search
    const timeoutId = setTimeout(getSuggestions, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (query.trim()) {
        onClose()
        router.push(`/search?q=${encodeURIComponent(query)}`)
      }
    },
    [query, onClose, router],
  )

  const handleSuggestionClick = useCallback(() => {
    onClose()
  }, [onClose])

  return (
    <div className="flex flex-col">
      <form
        className="flex items-center border-774-nevy-200 border-b dark:border-zinc-700"
        onSubmit={handleSubmit}
      >
        <Search className="ml-4 size-5 text-774-nevy-400 dark:text-774-nevy-300" />

        <DialogTitle className="sr-only">検索</DialogTitle>

        <input
          className="w-full bg-transparent px-4 py-4 text-primary outline-none placeholder:text-774-nevy-400 dark:text-774-nevy-50 dark:placeholder:text-774-nevy-500"
          name="q"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="検索..."
          type="search"
          value={query}
        />

        <div className="mr-4 flex items-center gap-2">
          <kbd className="hidden rounded border border-774-nevy-200 bg-774-nevy-100 px-2 py-1 font-mono text-774-nevy-500 text-xs sm:inline-block dark:border-zinc-700 dark:bg-zinc-800 dark:text-774-nevy-300">
            ESC
          </kbd>
        </div>
      </form>

      {/* Search suggestions */}
      <div>
        {isLoadingSuggestions ? (
          <div className="p-8 text-center text-774-nevy-400 text-sm dark:text-774-nevy-400">
            読み込み中...
          </div>
        ) : suggestions && suggestions.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            <div className="p-2">
              {suggestions.map((suggestion) => (
                <Link
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left hover:bg-774-nevy-100 dark:hover:bg-zinc-800"
                  data-suggestion-link
                  href={`/videos/${encodeURIComponent(suggestion.term)}`}
                  key={suggestion.term}
                  onClick={handleSuggestionClick}
                >
                  <Search className="size-4 text-774-nevy-400 dark:text-774-nevy-300" />
                  <span className="text-primary dark:text-774-nevy-50">
                    {suggestion.term}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-774-nevy-400 text-sm dark:text-774-nevy-400">
            {query
              ? `Enterキーを押して「${query}」を検索`
              : '動画のタイトルやタレント名で検索できます'}
          </div>
        )}
      </div>
    </div>
  )
}
