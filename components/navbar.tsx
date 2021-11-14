import clsx from 'clsx'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTheme } from 'next-themes'
import { useCallback, useState } from 'react'
import { FaMoon, FaSun } from 'react-icons/fa'
import Icon from '../assets/icon.svg'
import styles from './navbar.module.css'
import SearchForm from './search-form'
import type { VFC } from 'react'
import type { Group } from '../lib/algolia'

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

const Navbar: VFC = () => {
  const [sidebarShown, setSidebarShown] = useState(false)
  const router = useRouter()
  const { setTheme, theme } = useTheme()

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

          <Link href="/videos">
            <a
              aria-current={router.asPath === '/videos' ? 'page' : undefined}
              className={clsx('navbar__item', 'navbar__link', {
                'navbar__link--active': router.asPath === '/videos'
              })}
            >
              動画一覧
            </a>
          </Link>
        </div>

        <div className="navbar__items navbar__items--right">
          <div className="navbar__item dropdown dropdown--hoverable">
            <a className="navbar__link" href="#">
              グループ
            </a>
            <ul className="dropdown__menu">
              {groups.map((group) => (
                <li key={group.id}>
                  <Link href={`/groups/${group.id}/videos`}>
                    <a className="dropdown__link">{group.title}</a>
                  </Link>
                </li>
              ))}
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
                <Link href="/videos">
                  <a
                    aria-current={
                      router.asPath === '/videos' ? 'page' : undefined
                    }
                    className={clsx('menu__link', {
                      'navbar__link--active': router.asPath === '/videos'
                    })}
                    onClick={hideSidebar}
                  >
                    動画一覧
                  </a>
                </Link>
              </li>
              <li className="menu__list-item">
                <a className="menu__link menu__link--sublist" href="#">
                  グループ
                </a>
                <ul className="menu__list">
                  {groups.map((group) => (
                    <li className="menu__list-item" key={group.id}>
                      <Link href={`/groups/${group.id}/videos`}>
                        <a className="menu__link" onClick={hideSidebar}>
                          {group.title}
                        </a>
                      </Link>
                    </li>
                  ))}
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
