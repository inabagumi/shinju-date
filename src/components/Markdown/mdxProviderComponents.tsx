import clsx from 'clsx'
import NextLink from 'next/link'
import type { ComponentPropsWithoutRef, VFC } from 'react'

import styles from './Markdown.module.css'

type LinkProps = ComponentPropsWithoutRef<'a'>

const ExternalLink: VFC<LinkProps> = (props) => (
  // eslint-disable-next-line jsx-a11y/anchor-has-content
  <a {...props} rel="noopener noreferrer" target="_blank" />
)

const Link: VFC<LinkProps> = ({ href = '', ...props }) =>
  /^https?:\/\//.test(href) ? (
    <ExternalLink href={href} {...props} />
  ) : href.startsWith('/') ? (
    <NextLink href={href}>
      {/* eslint-disable-next-line jsx-a11y/anchor-has-content */}
      <a {...props} />
    </NextLink>
  ) : (
    // eslint-disable-next-line jsx-a11y/anchor-has-content
    <a href={href} {...props} />
  )

type HeadingProps = ComponentPropsWithoutRef<'h2'>

const H2: VFC<HeadingProps> = ({ className, ...props }) => (
  // eslint-disable-next-line jsx-a11y/heading-has-content
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
