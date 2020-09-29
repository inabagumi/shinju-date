import { FC } from 'react'

import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'

const Layout: FC = ({ children }) => (
  <>
    <Navbar />

    <main className="pt-16">{children}</main>

    <Footer />
  </>
)

export default Layout
