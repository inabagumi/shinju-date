/// <reference types="@mdx-js/loader" />

declare module '*.svg' {
  import { SVGProps, VFC } from 'react'

  type Props = SVGProps<SVGSVGElement>
  const content: VFC<Props>

  export default content
}
