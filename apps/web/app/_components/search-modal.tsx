'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useRouter } from 'next/navigation'
import {
  type ChangeEventHandler,
  type FormEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useSearchModal } from '@/lib/search-modal-store'
import { useKeyboardShortcut } from '@/lib/use-keyboard-shortcut'

export function SearchModal() {
  const { isOpen, close, open } = useSearchModal()
  const [query, setQuery] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useKeyboardShortcut('k', open, { ctrl: true, meta: true })

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      setQuery(event.target.value)
    },
    [],
  )

  const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault()
      if (query.trim() && !isSubmitting) {
        setIsSubmitting(true)
        close()
        router.push(`/videos/${encodeURIComponent(query.trim())}`)
        // Reset after navigation
        setTimeout(() => {
          setQuery('')
          setIsSubmitting(false)
        }, 100)
      }
    },
    [query, close, router, isSubmitting],
  )

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        close()
      }
    },
    [close],
  )

  return (
    <Dialog.Root onOpenChange={handleOpenChange} open={isOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in" />
        <Dialog.Content className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[20%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[20%] fixed top-[20%] left-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-20%] rounded-xl border border-774-nevy-200 bg-primary-foreground shadow-2xl data-[state=closed]:animate-out data-[state=open]:animate-in sm:max-w-3xl dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex flex-col">
            <form
              className="flex items-center border-774-nevy-200 border-b dark:border-zinc-700"
              onSubmit={handleSubmit}
            >
              <svg
                aria-hidden="true"
                className="ml-4 size-5 text-774-nevy-400 dark:text-774-nevy-300"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <Dialog.Title className="sr-only">検索</Dialog.Title>
              <input
                className="w-full border-0 bg-transparent px-4 py-4 text-primary outline-none placeholder:text-774-nevy-300 dark:text-774-nevy-50 dark:placeholder:text-774-nevy-400"
                disabled={isSubmitting}
                onChange={handleChange}
                placeholder="動画を検索..."
                ref={inputRef}
                type="text"
                value={query}
              />
              <div className="mr-4 flex items-center gap-2">
                <kbd className="hidden rounded border border-774-nevy-200 bg-774-nevy-100 px-2 py-1 font-mono text-774-nevy-500 text-xs sm:inline-block dark:border-zinc-700 dark:bg-zinc-800 dark:text-774-nevy-300">
                  ESC
                </kbd>
              </div>
            </form>

            {query.trim() ? (
              <div className="max-h-96 overflow-y-auto p-4">
                <div className="text-center text-774-nevy-400 text-sm dark:text-774-nevy-400">
                  Enterキーを押して「{query}」を検索
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-774-nevy-400 text-sm dark:text-774-nevy-400">
                動画のタイトルやチャンネル名で検索できます
              </div>
            )}
          </div>
          <Dialog.Close className="absolute top-4 right-4 rounded-full p-2 text-774-nevy-400 hover:bg-774-nevy-100 hover:text-774-nevy-600 dark:text-774-nevy-300 dark:hover:bg-zinc-800 dark:hover:text-774-nevy-100">
            <span className="sr-only">閉じる</span>
            <svg
              aria-hidden="true"
              className="size-5"
              fill="none"
              role="img"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
