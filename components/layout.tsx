import '@reach/skip-nav/styles.css'
import { SkipNavContent, SkipNavLink } from '@reach/skip-nav'
import { createContext, useContext } from 'react'
import Footer from './footer'
import styles from './layout.module.css'
import Navbar from './navbar'
import type { ReactNode, VFC } from 'react'

type Value = {
  basePath: string
}

const LayoutContext = createContext<Value>({
  basePath: '/videos'
})

export const LayoutProvider = LayoutContext.Provider

export function useBasePath(): string {
  const { basePath } = useContext(LayoutContext)

  return basePath
}

const SKIP_NAV_CONTENT_ID = 'content'

type Props = {
  basePath?: string
  children: ReactNode
}

const Layout: VFC<Props> = ({ basePath = '/videos', children }) => {
  return (
    <LayoutProvider
      value={{
        basePath
      }}
    >
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
