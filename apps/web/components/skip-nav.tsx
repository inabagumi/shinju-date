'use client'

import '@reach/skip-nav/styles.css'
import {
  SkipNavContent as SkipNavContentImpl,
  type SkipNavContentProps,
  SkipNavLink as SkipNavLinkImpl,
  type SkipNavLinkProps
} from '@reach/skip-nav'
import styles from './skip-nav.module.css'

export const DEFAULT_SKIP_NAV_CONTENT_ID = 'content'

export function SkipNavLink({
  contentId = DEFAULT_SKIP_NAV_CONTENT_ID,
  ...props
}: SkipNavLinkProps) {
  return (
    <SkipNavLinkImpl
      className={styles['link']}
      contentId={contentId}
      {...props}
    />
  )
}

export function SkipNavContent({
  id = DEFAULT_SKIP_NAV_CONTENT_ID,
  ...props
}: SkipNavContentProps) {
  return <SkipNavContentImpl className={styles['content']} id={id} {...props} />
}
