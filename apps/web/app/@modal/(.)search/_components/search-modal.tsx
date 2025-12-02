'use client'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@shinju-date/ui'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  type ComponentPropsWithRef,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

const ModalNavigationContext = createContext<{
  onNavigate: () => void
}>({
  onNavigate: () => {},
})

export function useModalNavigation() {
  return useContext(ModalNavigationContext)
}

export function SearchModal({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(true)
  const isNavigating = useRef(false)

  const handleClose = useCallback(
    (open: boolean) => {
      if (open) return

      setIsOpen(false)

      if (!isNavigating.current) {
        router.back()
      }

      // Reset the flag after the modal closes
      isNavigating.current = false
    },
    [router],
  )

  const handleNavigate = useCallback(() => {
    isNavigating.current = true
    setIsOpen(false)
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: モーダルを再表示するためにpathnameに依存する必要があります
  useEffect(() => {
    setIsOpen(true)
  }, [pathname])

  return (
    <Dialog onOpenChange={handleClose} open={isOpen}>
      <DialogPortal>
        <DialogOverlay className="z-50 backdrop-blur-sm" />

        <DialogContent className="data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[20%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[20%] top-[20%] left-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-20%] rounded-xl border-774-nevy-200 bg-primary-foreground p-0 shadow-2xl sm:max-w-3xl dark:border-zinc-700 dark:bg-zinc-900">
          <ModalNavigationContext value={{ onNavigate: handleNavigate }}>
            {children}
          </ModalNavigationContext>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

export function SearchModalLink({
  onClick,
  onKeyDown,
  ...props
}: ComponentPropsWithRef<typeof Link>) {
  const { onNavigate } = useModalNavigation()

  const handleClick = useCallback<React.MouseEventHandler<HTMLAnchorElement>>(
    (event) => {
      onClick?.(event)

      onNavigate()
    },
    [onClick, onNavigate],
  )

  const handleKeyDown = useCallback<
    React.KeyboardEventHandler<HTMLAnchorElement>
  >(
    (event) => {
      onKeyDown?.(event)

      // Handle arrow key navigation
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const allSuggestions = Array.from(
          document.querySelectorAll<HTMLAnchorElement>(
            '[data-suggestion-link]',
          ),
        )
        const currentIndex = allSuggestions.indexOf(event.currentTarget)

        if (
          event.key === 'ArrowDown' &&
          currentIndex < allSuggestions.length - 1
        ) {
          allSuggestions[currentIndex + 1]?.focus()
        } else if (event.key === 'ArrowUp') {
          if (currentIndex > 0) {
            allSuggestions[currentIndex - 1]?.focus()
          } else {
            // Focus back to the input field
            const input =
              document.querySelector<HTMLInputElement>('input[name="q"]')
            input?.focus()
          }
        }
      }
    },
    [onKeyDown],
  )

  return <Link onClick={handleClick} onKeyDown={handleKeyDown} {...props} />
}

export const SearchModalClose = DialogClose
export const SearchModalTitle = DialogTitle
