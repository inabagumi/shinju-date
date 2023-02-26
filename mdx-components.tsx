import { type FunctionComponent, type MDXComponents } from 'mdx/types'
import Link, { Props as LinkProps } from '@/ui/link'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { a: Link as FunctionComponent<LinkProps>, ...components }
}
