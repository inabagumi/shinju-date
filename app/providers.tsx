'use client'

import { MDXProvider } from '@mdx-js/react'
import { type FunctionComponent, type MDXComponents } from 'mdx/types'
import { ThemeProvider } from 'next-themes'
import { type ReactNode } from 'react'
import { IntlProvider } from 'react-intl'
import { GroupProvider } from '@/ui/group'
import Link, { Props as LinkProps } from '@/ui/link'

const mdxComponents: MDXComponents = {
  a: Link as FunctionComponent<LinkProps>
}

type Props = {
  children: ReactNode
}

export default function Providers({ children }: Props) {
  return (
    <IntlProvider locale="ja" timeZone="Asia/Tokyo">
      <ThemeProvider defaultTheme="system">
        <MDXProvider components={mdxComponents}>
          <GroupProvider>{children}</GroupProvider>
        </MDXProvider>
      </ThemeProvider>
    </IntlProvider>
  )
}
