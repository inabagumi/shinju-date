/// <reference types="@mdx-js/loader" />

declare module 'next-pwa' {
  import type { NextConfig } from 'next'

  export default function withPWA(config: NextConfig): NextConfig
}

declare module '*.svg' {
  import { SVGProps, VFC } from 'react'

  type Props = SVGProps<SVGSVGElement>
  const content: VFC<Props>

  export default content
}
