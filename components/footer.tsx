import Link from './link'
import type { VFC } from 'react'

const Footer: VFC = () => {
  return (
    <footer className="footer footer--dark">
      <div className="container container--fluid">
        <nav className="footer__links">
          <Link
            className="footer__link-item"
            href="https://haneru.dev/"
            rel="noopener noreferrer"
            target="_blank"
          >
            運営者情報
          </Link>
          <span className="footer__link-separator">·</span>
          <Link className="footer__link-item" href="/about">
            SHINJU DATEとは
          </Link>
          <span className="footer__link-separator">·</span>
          <Link className="footer__link-item" href="/terms">
            利用規約
          </Link>
          <span className="footer__link-separator">·</span>
          <Link className="footer__link-item" href="/privacy">
            プライバシーポリシー
          </Link>
          <span className="footer__link-separator">·</span>
        </nav>
      </div>
    </footer>
  )
}

export default Footer
