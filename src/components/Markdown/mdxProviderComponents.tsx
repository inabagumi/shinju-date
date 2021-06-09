import clsx from 'clsx'
import NextLink from 'next/link'
import type { ComponentPropsWithoutRef, VFC } from 'react'

import styles from './Markdown.module.css'

type LinkProps = ComponentPropsWithoutRef<'a'>

const ExternalLink: VFC<LinkProps> = (props) => (
  <a {...props} rel="noopener noreferrer" target="_blank" />
)

const Link: VFC<LinkProps> = ({ href = '', ...props }) =>
  /^https?:\/\//.test(href) ? (
    <ExternalLink href={href} {...props} />
  ) : href.startsWith('/') ? (
    <NextLink href={href}>
      <a {...props} />
    </NextLink>
  ) : (
    <a href={href} {...props} />
  )

type HeadingProps = ComponentPropsWithoutRef<'h2'>

const H2: VFC<HeadingProps> = ({ className, ...props }) => (
  <h2 className={clsx('margin-top--lg', className)} {...props} />
)

type OrderdListProps = ComponentPropsWithoutRef<'ol'>

const OrderedList: VFC<OrderdListProps> = ({ className, ...props }) => (
  <ol className={clsx(styles.orderedList, className)} {...props} />
)

const mdxProviderComponents = {
  a: Link,
  h2: H2,
  ol: OrderedList
}

export default mdxProviderComponents
