'use client'

import {
  type ComponentPropsWithoutRef,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

type DropdownMenuContextValue = {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null)

type DropdownMenuProps = {
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

type DropdownMenuTriggerProps = ComponentPropsWithoutRef<'button'>

export function DropdownMenuTrigger({
  children,
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
      className="rounded p-1 hover:bg-gray-100"
      onClick={handleClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
}

type DropdownMenuContentProps = {
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
      className={`absolute top-full z-50 mt-1 min-w-[160px] rounded-md border border-gray-200 bg-white py-1 shadow-lg ${
        align === 'right' ? 'right-0' : 'left-0'
      }`}
      ref={contentRef}
    >
      {children}
    </div>
  )
}

type DropdownMenuItemProps = ComponentPropsWithoutRef<'button'> & {
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
    danger: 'text-red-600 hover:bg-red-50',
    default: 'text-gray-700 hover:bg-gray-100',
  }

  return (
    <button
      className={`w-full px-4 py-2 text-left text-sm ${variantClasses[variant]} ${className || ''}`}
      onClick={handleClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
}
