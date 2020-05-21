/// <reference types="next" />
/// <reference types="next/types/global" />

declare module '*.jpeg'
declare module '*.jpg'
declare module '*.png'

declare module '*.svg' {
  import { FC, ReactSVGElement, SVGProps } from 'react'

  type Props = SVGProps<SVGSVGElement>
  const content: FC<Props>

  export default content
}
