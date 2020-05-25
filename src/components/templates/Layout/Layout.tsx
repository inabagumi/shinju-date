import React, { FC } from 'react'

import Footer from '@/components/organisms/Footer'
import Header from '@/components/organisms/Header'

import styles from './Layout.module.css'

const Layout: FC = ({ children }) => (
  <>
    <Header />

    <main className={styles.wrapper}>{children}</main>

    <Footer />
  </>
)

export default Layout
