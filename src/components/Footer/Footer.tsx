import Link from 'next/link'
import type { FC } from 'react'

const Footer: FC = () => {
  return (
    <footer className="footer footer--dark">
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
            <a className="footer__link-item">SHINJU DATEとは</a>
          </Link>
          <span className="footer__link-separator">·</span>
          <Link href="/terms" prefetch={false}>
            <a className="footer__link-item">利用規約</a>
          </Link>
          <span className="footer__link-separator">·</span>
          <Link href="/privacy" prefetch={false}>
            <a className="footer__link-item">プライバシーポリシー</a>
          </Link>
        </nav>
        <div>© Haneru Developers</div>
      </div>
    </footer>
  )
}

export default Footer
