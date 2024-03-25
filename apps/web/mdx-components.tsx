import { type MDXComponents } from 'mdx/types'
import NextLink from 'next/link'
import { type ComponentPropsWithoutRef } from 'react'

function Link({
  children,
  href,
  rel: originalRel,
  target: originalTarget,
  ...props
}: ComponentPropsWithoutRef<'a'>) {
  if (href && href.startsWith('/')) {
    return (
      <NextLink href={href} rel={originalRel} target={originalTarget}>
        {children}
      </NextLink>
    )
  }

  const isExternal = !!href && /^https?:\/\//.test(href)
  const rel = originalRel ?? isExternal ? 'noopener noreferrer' : undefined
  const target = originalTarget ?? isExternal ? '_blank' : undefined

  return (
    <a href={href} rel={rel} target={target} {...props}>
      {children}
    </a>
  )
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { a: Link, ...components }
}
