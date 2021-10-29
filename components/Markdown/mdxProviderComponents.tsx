import clsx from 'clsx'
import NextLink from 'next/link'
import type { ComponentPropsWithoutRef } from 'react'

import styles from './Markdown.module.css'

type LinkProps = ComponentPropsWithoutRef<'a'>

function ExternalLink(props: LinkProps) {
  return <a {...props} rel="noopener noreferrer" target="_blank" />
}

function Link({ href = '', ...props }: LinkProps) {
  return /^https?:\/\//.test(href) ? (
    <ExternalLink href={href} {...props} />
  ) : href.startsWith('/') ? (
    <NextLink href={href}>
      <a {...props} />
    </NextLink>
  ) : (
    <a href={href} {...props} />
  )
}

function H2({ className, ...props }: ComponentPropsWithoutRef<'h2'>) {
  return <h2 className={clsx('margin-top--lg', className)} {...props} />
}

function OrderedList({ className, ...props }: ComponentPropsWithoutRef<'ol'>) {
  return <ol className={clsx(styles.orderedList, className)} {...props} />
}

const mdxProviderComponents = {
  a: Link,
  h2: H2,
  ol: OrderedList
}

export default mdxProviderComponents
