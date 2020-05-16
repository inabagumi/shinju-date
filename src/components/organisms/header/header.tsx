import clsx from 'clsx'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React, { FC, useCallback, useContext, useEffect, useState } from 'react'
import { FaMoon, FaSun } from 'react-icons/fa'
import Toggle, { ToggleIcons } from 'react-toggle'
import css from 'styled-jsx/css'

import Logo from 'components/atoms/logo'
import SearchForm from 'components/molecules/search-form'
import { useSiteMetadata } from 'context/site-context'
import { ThemeContext } from 'context/theme-context'

const { className, styles } = css.resolve`
  .navbar__logo {
    width: auto;
  }

  .theme-toggle--lg {
    display: inline-block;
  }

  .theme-toggle--sm {
    display: none;
  }

  @media (max-width: 996px) {
    .theme-toggle--lg {
      display: none;
    }

    .theme-toggle--sm {
      display: inline-block;
    }
  }

  .theme-toggle__icon {
    color: #ffeb3b;
    display: inline-block;
    font-size: 0.8rem;
    vertical-align: middle;
  }
`

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

  useEffect(() => {
    document.documentElement.classList.toggle('fixed', sidebarShown)
  }, [sidebarShown])

  const toggleIcons: ToggleIcons = {
    checked: (
      <FaSun
        aria-label="ダークモードオフ"
        className={clsx('theme-toggle__icon', className)}
      />
    ),
    unchecked: (
      <FaMoon
        aria-label="ダークモードオン"
        className={clsx('theme-toggle__icon', className)}
      />
    )
  }

  return (
    <>
      <nav
        className={clsx('navbar', 'navbar--fixed-top', {
          'navbar-sidebar--show': sidebarShown
        })}
      >
        <div className="navbar__inner">
          <div className="navbar__items">
            <div
              aria-label="メニュー"
              className="navbar__toggle"
              onClick={showSidebar}
              onKeyDown={showSidebar}
              role="button"
              tabIndex={0}
            >
              <svg focusable="false" height="30" viewBox="0 0 30 30" width="30">
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
                <Logo className={clsx('navbar__logo', className)} />
              </a>
            </Link>
          </div>

          <div className="navbar__items navbar__items--right">
            <Toggle
              aria-label="ダークモード切り替え"
              checked={theme === 'dark'}
              className={clsx('theme-toggle', 'theme-toggle--lg', className)}
              icons={toggleIcons}
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
                <Logo className={clsx('navbar__logo', className)} />
              </a>
            </Link>
            <Toggle
              aria-label="ダークモード切り替え"
              checked={theme === 'dark'}
              className={clsx('theme-toggle', 'theme-toggle--sm', className)}
              icons={toggleIcons}
              onChange={toggleTheme}
              value="dark"
            />
          </div>

          <div className="navbar-sidebar__items">
            <div className="menu">
              <ul className="menu__list">
                <li className="menu__list-item">
                  <a
                    className="menu__link"
                    href="https://haneru.dev/"
                    onClick={hideSidebar}
                    onKeyDown={hideSidebar}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    運営者情報
                  </a>
                </li>
                <li className="menu__list-item">
                  <Link href="/about" prefetch={false}>
                    <a
                      className={clsx('menu__link', {
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
                      className={clsx('menu__link', {
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
                      className={clsx('menu__link', {
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

      <style global jsx>{`
        html.fixed,
        html.fixed body {
          height: 100%;
          overflow-y: hidden;
        }
      `}</style>

      <style jsx>{`
        .navbar__toggle {
          display: block;
        }

        .navbar__toggle svg {
          display: inline-block;
          vertical-align: middle;
        }

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
          max-width: 300px;
        }
      `}</style>

      {styles}
    </>
  )
}

export default Header
