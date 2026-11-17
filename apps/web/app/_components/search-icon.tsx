import type { SVGProps } from 'react'
import {
  SEARCH_ICON_CIRCLE,
  SEARCH_ICON_PATH,
  SEARCH_ICON_VIEW_BOX,
} from './svg-symbols'

export default function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" viewBox={SEARCH_ICON_VIEW_BOX} {...props}>
      <circle
        {...SEARCH_ICON_CIRCLE}
        fill="transparent"
        stroke="currentColor"
      />
      <path d={SEARCH_ICON_PATH} fill="currentColor" />
    </svg>
  )
}
