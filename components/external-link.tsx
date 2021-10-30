import { forwardRef } from 'react'
import type { Props as LinkProps } from './link'

export function isExternalLink(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://')
}

const ExternalLink = forwardRef<HTMLAnchorElement, LinkProps>(
  function ExternalLink({ rel, ...props }, ref) {
    const relList = rel?.trim().split(/\s+/) || []

    for (const value of ['noopener', 'noreferrer']) {
      if (!relList.includes(value)) {
        relList.push(value)
      }
    }

    return <a rel={relList.join(' ')} target="_blank" {...props} ref={ref} />
  }
)

export default ExternalLink
