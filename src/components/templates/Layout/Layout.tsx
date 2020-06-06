import React, { FC } from 'react'

import Footer from '@/components/organisms/Footer'
import Navbar from '@/components/organisms/Navbar'

import styles from './Layout.module.css'

const Layout: FC = ({ children }) => (
  <>
    <Navbar />

    <main className={styles.wrapper}>{children}</main>

    <Footer />
  </>
)

export default Layout
