import '@reach/skip-nav/styles.css'
import { SkipNavContent, SkipNavLink } from '@reach/skip-nav'
import Footer from './footer'
import styles from './layout.module.css'
import Navbar from './navbar'
import type { ReactNode, VFC } from 'react'

const SKIP_NAV_CONTENT_ID = 'content'

type Props = {
  basePath?: string
  children: ReactNode
}

const Layout: VFC<Props> = ({ basePath, children }) => {
  return (
    <div className={styles.wrapper}>
      <SkipNavLink
        className={styles.skipNavLink}
        contentId={SKIP_NAV_CONTENT_ID}
      >
        コンテンツにスキップ
      </SkipNavLink>

      <Navbar basePath={basePath} />

      <SkipNavContent className="padding-bottom--xl" id={SKIP_NAV_CONTENT_ID}>
        {children}
      </SkipNavContent>

      <Footer
        items={[
          {
            href: 'https://haneru.dev/',
            label: '運営者情報'
          },
          {
            href: '/about',
            label: 'SHINJU DATEとは'
          },
          {
            href: '/terms',
            label: '利用規約'
          },
          {
            href: '/privacy',
            label: 'プライバシーポリシー'
          }
        ]}
      />
    </div>
  )
}

export default Layout
