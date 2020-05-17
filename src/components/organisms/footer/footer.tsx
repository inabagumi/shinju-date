import Link from 'next/link'
import React, { FC } from 'react'

import { useSiteMetadata } from 'context/site-context'

const Footer: FC = () => {
  const { title: siteTitle } = useSiteMetadata()

  return (
    <div className="footer">
      <div className="container container--fluid">
        <nav className="footer__links">
          <a
            className="footer__link-item"
            href="https://haneru.dev/"
            rel="noopener noreferrer"
            target="_blank"
          >
            運営者情報
          </a>
          <span className="footer__link-separator">·</span>
          <Link href="/about" prefetch={false}>
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a className="footer__link-item">{siteTitle}とは</a>
          </Link>
          <span className="footer__link-separator">·</span>
          <Link href="/terms" prefetch={false}>
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a className="footer__link-item">利用規約</a>
          </Link>
          <span className="footer__link-separator">·</span>
          <Link href="/privacy" prefetch={false}>
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a className="footer__link-item">プライバシーポリシー</a>
          </Link>
        </nav>
        <div>Copyright © Haneru Developers</div>
      </div>
    </div>
  )
}

export default Footer
