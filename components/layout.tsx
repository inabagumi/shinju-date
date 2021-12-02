import '@reach/skip-nav/styles.css'
import { Temporal } from '@js-temporal/polyfill'
import { SkipNavLink } from '@reach/skip-nav'
import { type ReactNode, type VFC, createContext, useContext } from 'react'
import Footer from './footer'
import styles from './layout.module.css'
import Navbar from './navbar'

export const DEFAULT_SKIP_NAV_CONTENT_ID = 'content'

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
          contentId={DEFAULT_SKIP_NAV_CONTENT_ID}
        >
          コンテンツにスキップ
        </SkipNavLink>

        <Navbar />

        <div className="padding-bottom--xl">{children}</div>

        <Footer />
      </div>
    </LayoutProvider>
  )
}

export default Layout
