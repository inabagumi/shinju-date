import { SkipNavContent, SkipNavLink } from '@reach/skip-nav'
import type { FC } from 'react'

import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'

import styles from './Layout.module.css'

const SKIP_NAV_CONTENT_ID = 'content'

const Layout: FC = ({ children }) => (
  <>
    <div className={styles.wrapper}>
      <SkipNavLink
        className={styles.skipNavLink}
        contentId={SKIP_NAV_CONTENT_ID}
      >
        コンテンツにスキップ
      </SkipNavLink>

      <Navbar />

      <SkipNavContent id={SKIP_NAV_CONTENT_ID}>{children}</SkipNavContent>
    </div>

    <Footer />
  </>
)

export default Layout
