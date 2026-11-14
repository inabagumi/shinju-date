'use client'

import { Menu, X } from 'lucide-react'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'

interface MobileMenuProps {
  children: ReactNode
}

/**
 * Disclosure-style menu that exposes the primary navigation on narrow
 * viewports where the inline header links are hidden.
 */
export function MobileMenu({ children }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    const container = containerRef.current
    const menu = menuRef.current

    if (!isOpen || !container || !menu) return

    const close = () => setIsOpen(false)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
        buttonRef.current?.focus()
      }
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.contains(event.target)) {
        close()
      }
    }

    // Close the menu when the keyboard focus moves outside of it.
    const handleFocusOut = (event: FocusEvent) => {
      if (
        event.relatedTarget instanceof Node &&
        !container.contains(event.relatedTarget)
      ) {
        close()
      }
    }

    // Close the menu once one of its links has been activated, including
    // links to the current page that do not trigger a pathname change.
    const handleMenuClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('a')) {
        close()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)
    container.addEventListener('focusout', handleFocusOut)
    menu.addEventListener('click', handleMenuClick)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
      container.removeEventListener('focusout', handleFocusOut)
      menu.removeEventListener('click', handleMenuClick)
    }
  }, [isOpen])

  return (
    <div className="flex items-center md:hidden" ref={containerRef}>
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-label="メニュー"
        className="flex size-9 items-center justify-center rounded-full hover:bg-774-nevy-100 dark:hover:bg-zinc-700"
        onClick={() => setIsOpen((value) => !value)}
        ref={buttonRef}
        type="button"
      >
        {isOpen ? (
          <X aria-hidden="true" className="size-6" />
        ) : (
          <Menu aria-hidden="true" className="size-6" />
        )}
      </button>

      <div
        className="absolute inset-x-0 top-full border-t border-774-nevy-200 bg-primary-foreground shadow-md dark:border-zinc-700 dark:bg-zinc-900"
        hidden={!isOpen}
        id={menuId}
        ref={menuRef}
      >
        {children}
      </div>
    </div>
  )
}
