import NextLink from 'next/link'
import { forwardRef } from 'react'
import ExternalLink, { isExternalLink } from './external-link'
import type { ComponentPropsWithoutRef } from 'react'

export type Props = ComponentPropsWithoutRef<'a'>

const Link = forwardRef<HTMLAnchorElement, Props>(function Link(
  { href = '', ...props },
  ref
) {
  return isExternalLink(href) ? (
    <ExternalLink href={href} {...props} ref={ref} />
  ) : (
    <NextLink href={href}>
      <a {...props} ref={ref} />
    </NextLink>
  )
})

export default Link
