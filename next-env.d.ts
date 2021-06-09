/// <reference types="@mdx-js/loader" />
/// <reference types="next" />
/// <reference types="next/types/global" />

declare module './*.svg' {
  import { SVGProps, VFC } from 'react'

  type Props = SVGProps<SVGSVGElement>
  const content: VFC<Props>

  export default content
}
