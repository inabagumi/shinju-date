import { Slot } from '@radix-ui/react-slot'
import { twMerge } from '@shinju-date/ui'
import type { ComponentPropsWithRef } from 'react'

interface ListOptionProps extends ComponentPropsWithRef<'button'> {
  /** Render the child, such as `next/link`, instead of `<button>` */
  asChild?: boolean
}

/**
 * An option in a list of the search, such as a suggested keyword or a
 * talent to narrow the search to
 */
export function ListOption({
  asChild = false,
  className,
  type = 'button',
  ...props
}: ListOptionProps) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      className={twMerge(
        'flex w-full items-center gap-3 rounded-control px-4 py-3 text-left hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
        className,
      )}
      type={asChild ? undefined : type}
      {...props}
    />
  )
}

/** The icon in front of the text of `ListOption`. Pass the icon as the child */
export function ListOptionIcon({
  className,
  ...props
}: ComponentPropsWithRef<typeof Slot>) {
  return (
    <Slot
      aria-hidden="true"
      className={twMerge('size-4 shrink-0 text-muted', className)}
      {...props}
    />
  )
}
