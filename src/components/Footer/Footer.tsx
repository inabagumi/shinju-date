import Link from 'next/link'
import { FC } from 'react'

import { useSiteMetadata } from '@/context/SiteContext'

const Footer: FC = () => {
  const { title: siteTitle } = useSiteMetadata()

  return (
    <footer className="bg-gray-800 p-10 text-white">
      <div className="flex">
        <nav className="footer__links">
          <a
            className="footer__link-item"
            href="https://haneru.dev/"
            rel="noopener noreferrer"
            target="_blank"
          >
            運営者情報
          </a>
          <Link href="/about" prefetch={false}>
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a className="footer__link-item">{siteTitle}とは</a>
          </Link>
          <Link href="/terms" prefetch={false}>
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a className="footer__link-item">利用規約</a>
          </Link>
          <Link href="/privacy" prefetch={false}>
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a className="footer__link-item">プライバシーポリシー</a>
          </Link>
        </nav>
        <div>© Haneru Developers</div>
      </div>
    </footer>
  )
}

export default Footer
