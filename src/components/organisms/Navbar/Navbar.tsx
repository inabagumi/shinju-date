import clsx from 'clsx'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { FC, useCallback, useEffect, useState } from 'react'
import { FaMoon, FaSun } from 'react-icons/fa'
import Toggle, { ToggleIcons } from 'react-toggle'

import { Icon } from '@/assets'
import SearchForm from '@/components/molecules/SearchForm'
import { useSiteMetadata } from '@/context/SiteContext'
import { useTheme } from '@/context/ThemeContext'

import styles from './Navbar.module.css'

const toggleIcons: ToggleIcons = {
  checked: <FaSun aria-label="ダークモードオフ" className={styles.themeIcon} />,
  unchecked: (
    <FaMoon aria-label="ダークモードオン" className={styles.themeIcon} />
  )
}

const Navbar: FC = () => {
  const [sidebarShown, setSidebarShown] = useState(false)
  const router = useRouter()
  const [theme, toggleTheme] = useTheme()
  const { title: siteTitle } = useSiteMetadata()

  const showSidebar = useCallback(() => {
    setSidebarShown(true)
  }, [])

  const hideSidebar = useCallback(() => {
    setSidebarShown(false)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <nav
      className={clsx('navbar', 'navbar--fixed-top', {
        'navbar-sidebar--show': sidebarShown
      })}
    >
      <div className="navbar__inner">
        <div className="navbar__items">
          <div
            aria-label="メニューを開く"
            className="navbar__toggle"
            onClick={showSidebar}
            onKeyDown={showSidebar}
            role="button"
            tabIndex={0}
          >
            <svg
              focusable="false"
              height={30}
              role="img"
              viewBox="0 0 30 30"
              width={30}
            >
              <path
                d="M4 7h22M4 15h22M4 23h22"
                stroke="currentColor"
                strokeLinecap="round"
                strokeMiterlimit={10}
                strokeWidth={2}
              />
            </svg>
          </div>

          <Link href="/">
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a className="navbar__brand">
              <Icon
                className={clsx('navbar__logo', styles.logo)}
                height={32}
                role="img"
                width={32}
              />
              <strong className={clsx('navbar__title', styles.title)}>
                {siteTitle}
              </strong>
            </a>
          </Link>

          <Link href="/search">
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a
              aria-current={router.asPath === '/search' ? 'page' : undefined}
              className={clsx('navbar__item', 'navbar__link', {
                'navbar__link--active': router.asPath === '/search'
              })}
            >
              動画一覧
            </a>
          </Link>
          <Link href="/calendar">
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a
              aria-current={router.asPath === '/calendar' ? 'page' : undefined}
              className={clsx('navbar__item', 'navbar__link', {
                'navbar__link--active': router.asPath === '/calendar'
              })}
            >
              カレンダー
            </a>
          </Link>
        </div>

        <div className="navbar__items navbar__items--right">
          <Toggle
            aria-label={
              theme === 'dark'
                ? 'ダークモードをオフにする'
                : 'ダークモードをオンにする'
            }
            checked={theme === 'dark'}
            className={styles.toggle}
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
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
            <a className="navbar__brand" onClick={hideSidebar}>
              <Icon
                className="navbar__logo"
                height={32}
                role="img"
                width={32}
              />
              <strong className="navbar__title">{siteTitle}</strong>
            </a>
          </Link>

          <Toggle
            aria-label={
              theme === 'dark'
                ? 'ダークモードをオフにする'
                : 'ダークモードをオンにする'
            }
            checked={theme === 'dark'}
            icons={toggleIcons}
            onChange={toggleTheme}
            value="dark"
          />
        </div>
        <div className="navbar-sidebar__items">
          <div className="menu">
            <ul className="menu__list">
              <li className="menu__list-item">
                <Link href="/search">
                  {/* eslint-disable-next-line jsx-a11y/anchor-is-valid, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                  <a
                    aria-current={
                      router.asPath === '/search' ? 'page' : undefined
                    }
                    className={clsx('menu__link', {
                      'navbar__link--active': router.asPath === '/search'
                    })}
                    onClick={hideSidebar}
                  >
                    動画一覧
                  </a>
                </Link>
              </li>
              <li className="menu__list-item">
                <Link href="/calendar">
                  {/* eslint-disable-next-line jsx-a11y/anchor-is-valid, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                  <a
                    aria-current={
                      router.asPath === '/calendar' ? 'page' : undefined
                    }
                    className={clsx('menu__link', {
                      'navbar__link--active': router.asPath === '/calendar'
                    })}
                    onClick={hideSidebar}
                  >
                    カレンダー
                  </a>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
