import type { FC } from 'react'

import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'

import styles from './Layout.module.css'

const Layout: FC = ({ children }) => (
  <>
    <div className={styles.wrapper}>
      <Navbar />

      {children}
    </div>

    <Footer />
  </>
)

export default Layout
