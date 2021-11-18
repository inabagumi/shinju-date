import clsx from 'clsx'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useCallback, useMemo, useState } from 'react'
import { FaMoon, FaSun } from 'react-icons/fa'
import Icon from '../assets/icon.svg'
import { getQueryValue } from '../lib/url'
import styles from './navbar.module.css'
import SearchForm from './search-form'
import type { Group } from '../lib/algolia'
import type { VFC } from 'react'

const groups: Group[] = [
  {
    id: 'animare',
    title: '有閑喫茶「あにまーれ」'
  },
  {
    id: 'honeystrap',
    title: 'HoneyStrap-ハニーストラップ-'
  },
  {
    id: 'vapart',
    title: 'ブイアパ'
  },
  {
    id: 'sugarlyric',
    title: 'SugarLyric -シュガーリリック-'
  },
  {
    id: 'hiyocro',
    title: '緋翼のクロスピース -ひよクロ-'
  }
]

type Props = {
  basePath?: string
}

const Navbar: VFC<Props> = ({ basePath }) => {
  const [sidebarShown, setSidebarShown] = useState(false)
  const router = useRouter()
  const { setTheme, theme } = useTheme()
  const query = useMemo(() => getQueryValue('q', router.query), [router.query])

  const showSidebar = useCallback(() => {
    setSidebarShown(true)
  }, [])

  const hideSidebar = useCallback(() => {
    setSidebarShown(false)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [setTheme, theme])

  return (
    <nav
      className={clsx('navbar', 'navbar--fixed-top', {
        'navbar-sidebar--show': sidebarShown
      })}
    >
      <div className="navbar__inner">
        <div className="navbar__items">
          <button
            aria-label="メニューを開く"
            className="clean-btn navbar__toggle"
            onClick={showSidebar}
            onKeyDown={showSidebar}
            tabIndex={0}
            type="button"
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
          </button>

          <Link href="/">
            <a className="navbar__brand">
              <Icon
                className={clsx('navbar__logo', styles.logo)}
                height={32}
                role="img"
                width={32}
              />
              <strong className={clsx('navbar__title', styles.title)}>
                SHINJU DATE
              </strong>
            </a>
          </Link>

          <Link href="/about">
            <a
              aria-current={router.pathname === '/about' ? 'page' : undefined}
              className={clsx('navbar__item', 'navbar__link', {
                'navbar__link--active': router.pathname === '/about'
              })}
            >
              SHINJU DATEとは
            </a>
          </Link>

          <Link
            aria-current={router.pathname === '/videos' ? 'page' : 'undefined'}
            href="/videos"
          >
            <a
              className={clsx('navbar__item', 'navbar__link', {
                'navbar__link--active': router.pathname === '/videos'
              })}
            >
              動画一覧
            </a>
          </Link>
        </div>

        <div className="navbar__items navbar__items--right">
          <div className="navbar__item dropdown dropdown--hoverable">
            <Link
              href={`${basePath?.endsWith('/videos') ? basePath : '/videos'}${
                query ? `?q=${query}` : ''
              }`}
            >
              <a className="navbar__link">
                {groups.find(
                  (group) => basePath === `/groups/${group.id}/videos`
                )?.title ?? '全グループ'}
              </a>
            </Link>
            <ul className="dropdown__menu">
              <li>
                <Link href={`/videos${query ? `?q=${query}` : ''}`}>
                  <a
                    aria-current={basePath === '/videos' ? 'page' : undefined}
                    className={clsx('dropdown__link', {
                      'dropdown__link--active': basePath === '/videos'
                    })}
                  >
                    全グループ
                  </a>
                </Link>
              </li>
              {groups.map((group) => {
                const pathname = `/groups/${group.id}/videos`
                const isActive = basePath === pathname

                return (
                  <li key={group.id}>
                    <Link href={`${pathname}${query ? `?q=${query}` : ''}`}>
                      <a
                        aria-current={isActive ? 'page' : undefined}
                        className={clsx('dropdown__link', {
                          'dropdown__link--active': isActive
                        })}
                      >
                        {group.title}
                      </a>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>

          <button
            className={clsx(
              'navbar__item',
              'navbar__link',
              styles.navbarButton
            )}
            onClick={toggleTheme}
            type="button"
          >
            {theme === 'dark' ? <FaSun /> : <FaMoon />}
          </button>

          <SearchForm basePath={basePath} />
        </div>
      </div>

      <div
        className="navbar-sidebar__backdrop"
        onClick={hideSidebar}
        role="presentation"
      />

      <div className="navbar-sidebar">
        <div className="navbar-sidebar__brand">
          <Link href="/">
            <a className="navbar__brand" onClick={hideSidebar}>
              <Icon
                className="navbar__logo"
                height={32}
                role="img"
                width={32}
              />
              <strong className="navbar__title">SHINJU DATE</strong>
            </a>
          </Link>
        </div>
        <div className="navbar-sidebar__items">
          <div className="menu navbar-sidebar__item">
            <ul className="menu__list">
              <li className="menu__list-item">
                <Link href="/about">
                  <a
                    aria-current={
                      router.pathname === '/about' ? 'page' : undefined
                    }
                    className={clsx('menu__link', {
                      'menu__link--active': router.pathname === '/about'
                    })}
                    onClick={hideSidebar}
                  >
                    SHINJU DATEとは
                  </a>
                </Link>
              </li>
              <li className="menu__list-item">
                <a className="menu__link menu__link--sublist" role="button">
                  動画一覧
                </a>
                <ul className="menu__list">
                  <li className="menu__list-item">
                    <Link href={`/videos${query ? `?q=${query}` : ''}`}>
                      <a
                        aria-current={
                          basePath === '/videos' ? 'page' : undefined
                        }
                        className={clsx('menu__link', {
                          'menu__link--active': basePath === '/videos'
                        })}
                        onClick={hideSidebar}
                      >
                        全グループ
                      </a>
                    </Link>
                  </li>
                  {groups.map((group) => {
                    const pathname = `/groups/${group.id}/videos`
                    const isActive = basePath === pathname

                    return (
                      <li className="menu__list-item" key={group.id}>
                        <Link href={`${pathname}${query ? `?q=${query}` : ''}`}>
                          <a
                            aria-current={isActive ? 'page' : undefined}
                            className={clsx('menu__link', {
                              'menu__link--active': isActive
                            })}
                            onClick={hideSidebar}
                          >
                            {group.title}
                          </a>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
