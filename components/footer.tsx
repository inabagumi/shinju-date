import Link from './link'
import type { ReactNode, VFC } from 'react'

export type Item = {
  href: string
  label: string
  target?: '_blank'
}

export type Props = {
  items: Item[]
}

const Footer: VFC<Props> = ({ items }) => {
  return (
    <footer className="footer footer--dark">
      <div className="container container--fluid">
        <nav className="footer__links">
          {items.reduce<ReactNode[]>(
            (previousValue, currentValue, index) =>
              [
                ...previousValue,
                index > 0 && (
                  <span
                    className="footer__link-separator"
                    key={`separator-${index}`}
                  >
                    ·
                  </span>
                ),
                <Link
                  className="footer__link-item"
                  href={currentValue.href}
                  key={currentValue.href}
                  rel={currentValue.target && 'noopener noreferrer'}
                  target={currentValue.target}
                >
                  {currentValue.label}
                </Link>
              ].filter(Boolean),
            []
          )}
        </nav>
      </div>
    </footer>
  )
}

export default Footer
