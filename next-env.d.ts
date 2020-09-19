/// <reference types="next" />
/// <reference types="next/types/global" />

declare module '*.jpeg' {
  const url: string

  export default url
}

declare module '*.jpg' {
  const url: string

  export default url
}

declare module '*.png' {
  const url: string

  export default url
}

declare module '*.svg' {
  import { FC, SVGProps } from 'react'

  type Props = SVGProps<SVGSVGElement>
  const content: FC<Props>

  export default content
}
