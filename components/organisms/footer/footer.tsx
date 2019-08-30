import Link from 'next/link'
import React, { FC } from 'react'

const Footer: FC = () => {
  return (
    <footer className="footer footer--dark margin-top--lg">
      <div className="container">
        <div className="footer__links">
          <Link href="/about">
            <a className="footer__link-item" href="/about">
              About
            </a>
          </Link>
          <span className="footer__link-separator">·</span>
          <Link href="/terms">
            <a className="footer__link-item" href="/terms">
              利用規約
            </a>
          </Link>
          <span className="footer__link-separator">·</span>
          <Link href="/privacy">
            <a className="footer__link-item" href="/privacy">
              プライバシーポリシー
            </a>
          </Link>
        </div>
        <div>Copyright © 2019 Haneru Developers</div>
      </div>
    </footer>
  )
}

export default Footer
