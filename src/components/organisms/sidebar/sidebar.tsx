import clsx from 'clsx'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React, { FC, ReactElement } from 'react'

import { useSiteMetadata } from 'context/site-context'

const Sidebar: FC = (): ReactElement => {
  const router = useRouter()
  const { title } = useSiteMetadata()

  return (
    <>
      <div className="sidebar padding-vert--sm">
        <div className="menu">
          <ul className="menu__list">
            <li className="menu__list-item">
              <Link href="/about" prefetch={false}>
                <a
                  className={clsx('menu__link', {
                    'menu__link--active': router.pathname === '/about'
                  })}
                  href="/about"
                >
                  {title}
                  とは
                </a>
              </Link>
            </li>
            <li className="menu__list-item">
              <Link href="/terms" prefetch={false}>
                <a
                  className={clsx('menu__link', {
                    'menu__link--active': router.pathname === '/terms'
                  })}
                  href="/terms"
                >
                  利用規約
                </a>
              </Link>
            </li>
            <li className="menu__list-item">
              <Link href="/privacy" prefetch={false}>
                <a
                  className={clsx('menu__link', {
                    'menu__link--active': router.pathname === '/privacy'
                  })}
                  href="/privacy"
                >
                  プライバシーポリシー
                </a>
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        .sidebar {
          display: flex;
          flex-direction: column;
          height: calc(100vh - var(--ifm-navbar-height));
          justify-content: flex-end;
          overflow-y: auto;
          position: sticky;
          top: var(--ifm-navbar-height);
        }

        @media (max-width: 996px) {
          .sidebar {
            display: none;
          }
        }

        .menu__link {
          font-size: 0.85rem;
        }
      `}</style>
    </>
  )
}

export default Sidebar
