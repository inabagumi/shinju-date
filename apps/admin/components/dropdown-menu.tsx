'use client'

import { twMerge } from '@shinju-date/ui'
import {
  type ComponentPropsWithoutRef,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

interface DropdownMenuContextValue {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null)

interface DropdownMenuProps {
  children: ReactNode
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <DropdownMenuContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  )
}

interface DropdownMenuTriggerProps extends ComponentPropsWithoutRef<'button'> {}

export function DropdownMenuTrigger({
  children,
  className,
  onClick,
  ...props
}: DropdownMenuTriggerProps) {
  const context = useContext(DropdownMenuContext)
  if (!context)
    throw new Error('DropdownMenuTrigger must be used within DropdownMenu')

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    context.setIsOpen(!context.isOpen)
    onClick?.(e)
  }

  return (
    <button
      aria-expanded={context.isOpen}
      aria-haspopup="menu"
      className={twMerge(
        'rounded-control p-1 text-muted transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        className,
      )}
      onClick={handleClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
}

interface DropdownMenuContentProps {
  children: ReactNode
  align?: 'left' | 'right'
}

export function DropdownMenuContent({
  align = 'right',
  children,
}: DropdownMenuContentProps) {
  const context = useContext(DropdownMenuContext)
  const contentRef = useRef<HTMLDivElement>(null)

  if (!context)
    throw new Error('DropdownMenuContent must be used within DropdownMenu')

  useEffect(() => {
    if (!context.isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node)
      ) {
        context.setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [context, context.isOpen])

  if (!context.isOpen) return null

  return (
    <div
      className={twMerge(
        'absolute top-full z-50 mt-1 min-w-40 rounded-container border border-border bg-surface p-1 shadow-overlay',
        align === 'right' ? 'right-0' : 'left-0',
      )}
      ref={contentRef}
    >
      {children}
    </div>
  )
}

interface DropdownMenuItemProps extends ComponentPropsWithoutRef<'button'> {
  variant?: 'default' | 'danger'
}

export function DropdownMenuItem({
  children,
  className,
  onClick,
  variant = 'default',
  ...props
}: DropdownMenuItemProps) {
  const context = useContext(DropdownMenuContext)
  if (!context)
    throw new Error('DropdownMenuItem must be used within DropdownMenu')

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
    context.setIsOpen(false)
  }

  const variantClasses = {
    danger: 'text-danger hover:bg-danger/10 focus-visible:bg-danger/10',
    default: 'text-foreground hover:bg-muted focus-visible:bg-muted',
  }

  return (
    <button
      className={twMerge(
        'flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-meta whitespace-nowrap transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        className,
      )}
      onClick={handleClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
}
