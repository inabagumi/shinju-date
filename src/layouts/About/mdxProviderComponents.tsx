import { MDXProviderComponentsProp } from '@mdx-js/react'
import clsx from 'clsx'
import NextLink from 'next/link'
import React, {
  AnchorHTMLAttributes,
  DetailedHTMLProps,
  FC,
  HTMLAttributes,
  OlHTMLAttributes
} from 'react'

import styles from './About.module.css'

type LinkProps = DetailedHTMLProps<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
>

const ExternalLink: FC<LinkProps> = (props) => (
  // eslint-disable-next-line jsx-a11y/anchor-has-content
  <a {...props} rel="noopener noreferrer" target="_blank" />
)

const Link: FC<LinkProps> = ({ href = '', ...props }) =>
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

type HeadingProps = DetailedHTMLProps<
  HTMLAttributes<HTMLHeadingElement>,
  HTMLHeadingElement
>

const H2: FC<HeadingProps> = ({ className, ...props }) => (
  // eslint-disable-next-line jsx-a11y/heading-has-content
  <h2 className={clsx('margin-top--lg', className)} {...props} />
)

type OrderdListProps = DetailedHTMLProps<
  OlHTMLAttributes<HTMLOListElement>,
  HTMLOListElement
>

const OrderedList: FC<OrderdListProps> = ({ className, ...props }) => (
  <ol className={clsx(styles.orderedList, className)} {...props} />
)

const mdxProviderComponents: MDXProviderComponentsProp = {
  a: Link,
  h2: H2,
  ol: OrderedList
}

export default mdxProviderComponents
