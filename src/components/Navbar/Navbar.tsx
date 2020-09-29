import Link from 'next/link'
import type { FC } from 'react'

import { Icon } from '@/assets'

const Navbar: FC = () => {
  return (
    <nav className="bg-white border-b border-gray-200 fixed h-16 inset-x-0 top-0 z-100">
      <div className="flex h-full items-center max-w-screen-xl mx-auto px-6 w-full">
        <Link href="/">
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
          <a className="flex items-center">
            <Icon className="h-8 mr-2 w-auto" />
            <span className="font-bold text-lg">SHINJU DATE</span>
          </a>
        </Link>
      </div>
    </nav>
  )
}

export default Navbar
