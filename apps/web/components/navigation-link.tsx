import { Slot } from '@radix-ui/react-slot'
import { twMerge } from '@shinju-date/ui'
import Link from 'next/link'
import type { ComponentPropsWithRef } from 'react'

/**
 * A link to another page or the next part of the same list, such as the
 * schedule of the next week, with a chevron next to the text
 */
export function NavigationLink({
  className,
  ...props
}: ComponentPropsWithRef<typeof Link>) {
  return (
    <Link
      className={twMerge(
        'inline-flex items-center gap-0.5 rounded-control font-semibold text-accent focus-ring hover:underline',
        className,
      )}
      {...props}
    />
  )
}

/** The chevron of `NavigationLink`. Pass the icon as the child */
export function NavigationLinkIcon({
  className,
  ...props
}: ComponentPropsWithRef<typeof Slot>) {
  return (
    <Slot
      aria-hidden="true"
      className={twMerge('size-4', className)}
      {...props}
    />
  )
}
