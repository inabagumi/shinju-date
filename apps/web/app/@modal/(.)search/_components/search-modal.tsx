'use client'

import * as Dialog from '@radix-ui/react-dialog'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  const [isOpen, setIsOpen] = useState(true)
  const isNavigating = useRef(false)

  const handleClose = useCallback(
    (open: boolean) => {
      if (open) return

      setIsOpen(false)

      if (!isNavigating.current) {
        router.back()
      }
    },
    [router],
  )

  const handleNavigate = useCallback(() => {
    isNavigating.current = true
  }, [])

  useEffect(() => {
    setIsOpen(true)
  }, [])

  return (
    <Dialog.Root onOpenChange={handleClose} open={isOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in" />

        <Dialog.Content className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[20%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[20%] fixed top-[20%] left-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-20%] rounded-xl border border-774-nevy-200 bg-primary-foreground shadow-2xl data-[state=closed]:animate-out data-[state=open]:animate-in sm:max-w-3xl dark:border-zinc-700 dark:bg-zinc-900">
          <ModalNavigationContext value={{ onNavigate: handleNavigate }}>
            {children}
          </ModalNavigationContext>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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

export const SearchModalClose = Dialog.Close
export const SearchModalTitle = Dialog.Title
