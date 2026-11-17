'use client'

import * as Popover from '@radix-ui/react-popover'
import { Slot } from '@radix-ui/react-slot'
import { twMerge } from '@shinju-date/ui'
import {
  type ComponentPropsWithoutRef,
  createContext,
  type MouseEvent,
  type ReactNode,
  useContext,
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

/**
 * 行末の「︙」などから開くメニュー。中身はポータルに描画するため、
 * 横にスクロールする表の中に置いても枠で切れない。
 */
export function DropdownMenu({ children }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <DropdownMenuContext.Provider value={{ isOpen, setIsOpen }}>
      <Popover.Root onOpenChange={setIsOpen} open={isOpen}>
        {children}
      </Popover.Root>
    </DropdownMenuContext.Provider>
  )
}

interface DropdownMenuTriggerProps extends ComponentPropsWithoutRef<'button'> {}

export function DropdownMenuTrigger({
  className,
  onClick,
  ...props
}: DropdownMenuTriggerProps) {
  const context = useContext(DropdownMenuContext)
  if (!context)
    throw new Error('DropdownMenuTrigger must be used within DropdownMenu')

  return (
    <Popover.Trigger asChild>
      <button
        aria-haspopup="menu"
        className={twMerge(
          'rounded-control p-1 text-muted focus-ring transition-colors hover:bg-muted hover:text-foreground',
          className,
        )}
        onClick={(e) => {
          e.stopPropagation()
          onClick?.(e)
        }}
        type="button"
        {...props}
      />
    </Popover.Trigger>
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

  if (!context)
    throw new Error('DropdownMenuContent must be used within DropdownMenu')

  return (
    <Popover.Portal>
      <Popover.Content
        align={align === 'right' ? 'end' : 'start'}
        className="z-50 min-w-40 rounded-container border border-border bg-surface p-1 text-foreground shadow-overlay"
        collisionPadding={8}
        role="menu"
        sideOffset={4}
      >
        {children}
      </Popover.Content>
    </Popover.Portal>
  )
}

interface DropdownMenuItemProps extends ComponentPropsWithoutRef<'button'> {
  /**
   * 子の要素（リンクなど）を項目として描く。新しいタブで開くリンクなど、
   * ボタンではなく `<a>` にしたい項目に使う。
   */
  asChild?: boolean
  variant?: 'default' | 'danger'
}

export function DropdownMenuItem({
  asChild = false,
  children,
  className,
  onClick,
  variant = 'default',
  ...props
}: DropdownMenuItemProps) {
  const context = useContext(DropdownMenuContext)
  if (!context)
    throw new Error('DropdownMenuItem must be used within DropdownMenu')

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
    context.setIsOpen(false)
  }

  const variantClasses = {
    danger: 'text-danger hover:bg-danger/10 focus-visible:bg-danger/10',
    default: 'text-foreground hover:bg-muted focus-visible:bg-muted',
  }

  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      className={twMerge(
        'flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-meta whitespace-nowrap transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        className,
      )}
      onClick={handleClick}
      role="menuitem"
      {...(asChild ? {} : { type: 'button' as const })}
      {...props}
    >
      {children}
    </Comp>
  )
}
