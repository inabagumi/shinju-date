import Link from 'next/link'

export default function Footer(): JSX.Element {
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
          <Link className="footer__link-item" href="/terms">
            利用規約
          </Link>
          <span className="footer__link-separator">·</span>
          <Link className="footer__link-item" href="/privacy">
            プライバシーポリシー
          </Link>
        </nav>
      </div>
    </footer>
  )
}
