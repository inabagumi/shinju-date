import classNames from 'classnames'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React, { FC, useCallback, useContext, useEffect, useState } from 'react'
import Toggle from 'react-toggle'

import Logo from 'components/atoms/logo'
import SearchForm from 'components/molecules/search-form'
import { useSiteMetadata } from 'context/site-context'
import { ThemeContext } from 'context/theme-context'

import Moon from './moon'
import Sun from './sun'

const Header: FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext)
  const [sidebarShown, setSidebarShown] = useState<boolean>(false)
  const router = useRouter()
  const { title: siteTitle } = useSiteMetadata()

  const showSidebar = useCallback((): void => {
    setSidebarShown(true)
  }, [setSidebarShown])

  const hideSidebar = useCallback((): void => {
    setSidebarShown(false)
  }, [setSidebarShown])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <>
      <nav
        className={classNames('navbar', 'navbar--fixed-top', {
          'navbar-sidebar--show': sidebarShown
        })}
      >
        <div className="navbar__inner">
          <div className="navbar__items">
            <div
              className="navbar__toggle"
              onClick={showSidebar}
              onKeyDown={showSidebar}
              role="button"
              tabIndex={0}
            >
              <svg focusable="false" height="30" viewBox="0 0 30 30" width="30">
                <title>メニュー</title>
                <path
                  d="M4 7h22M4 15h22M4 23h22"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeMiterlimit="10"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <Link href="/">
              <a
                aria-label={siteTitle}
                className="navbar__brand"
                href="/"
                tabIndex={-1}
              >
                <Logo className="navbar__logo" />
              </a>
            </Link>
          </div>

          <div className="navbar__items navbar__items--right">
            <Toggle
              aria-label="ダークモード切り替え"
              checked={theme === 'dark'}
              className="react-toggle--lg-only"
              icons={{
                checked: <Sun />,
                unchecked: <Moon />
              }}
              onChange={toggleTheme}
              value="dark"
            />

            <SearchForm />
          </div>
        </div>

        <div
          role="presentation"
          className="navbar-sidebar__backdrop"
          onClick={hideSidebar}
        />

        <div className="navbar-sidebar">
          <div className="navbar-sidebar__brand">
            <Link href="/">
              <a
                aria-label={siteTitle}
                className="navbar__brand"
                href="/"
                onClick={hideSidebar}
                onKeyDown={hideSidebar}
                tabIndex={-1}
              >
                <Logo className="navbar__logo" />
              </a>
            </Link>
            <Toggle
              aria-label="ダークモード切り替え"
              checked={theme === 'dark'}
              icons={{
                checked: <Sun />,
                unchecked: <Moon />
              }}
              onChange={toggleTheme}
              value="dark"
            />
          </div>

          <div className="navbar-sidebar__items">
            <div className="menu">
              <ul className="menu__list">
                <li className="menu__list-item">
                  <Link href="/about" prefetch={false}>
                    <a
                      className={classNames('menu__link', {
                        'menu__link--active': router.pathname === '/about'
                      })}
                      href="/about"
                      onClick={hideSidebar}
                      onKeyDown={hideSidebar}
                    >
                      {siteTitle}
                      とは?
                    </a>
                  </Link>
                </li>
                <li className="menu__list-item">
                  <Link href="/terms" prefetch={false}>
                    <a
                      className={classNames('menu__link', {
                        'menu__link--active': router.pathname === '/terms'
                      })}
                      href="/terms"
                      onClick={hideSidebar}
                      onKeyDown={hideSidebar}
                    >
                      利用規約
                    </a>
                  </Link>
                </li>
                <li className="menu__list-item">
                  <Link href="/privacy" prefetch={false}>
                    <a
                      className={classNames('menu__link', {
                        'menu__link--active': router.pathname === '/privacy'
                      })}
                      href="/privacy"
                      onClick={hideSidebar}
                      onKeyDown={hideSidebar}
                    >
                      プライバシーポリシー
                    </a>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      <style jsx>{`
        @media (max-width: 996px) {
          .navbar__items {
            flex-grow: 0;
          }

          .navbar__items--right {
            flex-grow: 1;
          }

          .navbar__items .navbar__brand {
            display: none;
          }
        }

        .navbar:not(.navbar--sidebar-show) .navbar-sidebar {
          box-shadow: none;
        }

        .navbar-sidebar {
          display: flex;
          flex-direction: column;
        }

        .navbar :global(.navbar__logo) {
          width: auto;
        }
      `}</style>
    </>
  )
}

export default Header
