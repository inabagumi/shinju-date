import { MDXProviderComponentsProp } from '@mdx-js/react'
import clsx from 'clsx'
import NextLink from 'next/link'
import React, {
  AnchorHTMLAttributes,
  DetailedHTMLProps,
  FC,
  HTMLAttributes
} from 'react'

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

const mdxProviderComponents: MDXProviderComponentsProp = {
  a: Link,
  h2: H2
}

export default mdxProviderComponents
