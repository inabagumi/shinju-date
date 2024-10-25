import { type MDXComponents } from 'mdx/types'
import NextLink, { type LinkProps } from 'next/link'
import { type ComponentPropsWithoutRef } from 'react'

function Link({
  children,
  href,
  onMouseEnter,
  onTouchStart,
  onClick,
  ...props
}: ComponentPropsWithoutRef<'a'>) {
  if (href && href.startsWith('/')) {
    const linkProps: Partial<LinkProps> = {}

    if (typeof onMouseEnter === 'function') {
      linkProps.onMouseEnter = onMouseEnter
    }

    if (typeof onTouchStart === 'function') {
      linkProps.onTouchStart = onTouchStart
    }

    if (typeof onClick === 'function') {
      linkProps.onClick = onClick
    }

    return (
      <NextLink href={href} {...props} {...linkProps}>
        {children}
      </NextLink>
    )
  }

  return (
    <a href={href} {...props}>
      {children}
    </a>
  )
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: Link,
    ...components
  }
}
