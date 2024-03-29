import { type SVGProps } from 'react'

export default function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 256 256" {...props}>
      <circle
        cx="97.5"
        cy="100.5"
        fill="transparent"
        r="52"
        stroke="currentColor"
        strokeWidth="21"
      />
      <path
        d="M146.14 137l58.34 58.34a5 5 0 010 7.07l-7.07 7.07a5 5 0 01-7.07 0L132 151.14 146.14 137z"
        fill="currentColor"
      />
    </svg>
  )
}
