import '@reach/skip-nav/styles.css'
import { Temporal } from '@js-temporal/polyfill'
import { SkipNavContent, SkipNavLink } from '@reach/skip-nav'
import { type ReactNode, type VFC, createContext, useContext } from 'react'
import Footer from './footer'
import styles from './layout.module.css'
import Navbar from './navbar'

type Value = {
  basePath: string
  now?: number
}

const LayoutContext = createContext<Value>({
  basePath: '/'
})

export const LayoutProvider = LayoutContext.Provider

export function useBasePath(): string {
  const { basePath } = useContext(LayoutContext)

  return basePath
}

export function useNow(): Temporal.Instant {
  const { now: rawNow } = useContext(LayoutContext)
  const now =
    typeof rawNow !== 'undefined'
      ? Temporal.Instant.fromEpochSeconds(rawNow)
      : rawNow

  return now ?? Temporal.Now.instant()
}

const SKIP_NAV_CONTENT_ID = 'content'

type Props = {
  basePath?: string
  children: ReactNode
  now?: number
}

const Layout: VFC<Props> = ({ basePath = '/', children, now }) => {
  return (
    <LayoutProvider value={{ basePath, now }}>
      <div className={styles.wrapper}>
        <SkipNavLink
          className={styles.skipNavLink}
          contentId={SKIP_NAV_CONTENT_ID}
        >
          コンテンツにスキップ
        </SkipNavLink>

        <Navbar />

        <SkipNavContent className="padding-bottom--xl" id={SKIP_NAV_CONTENT_ID}>
          {children}
        </SkipNavContent>

        <Footer />
      </div>
    </LayoutProvider>
  )
}

export default Layout
