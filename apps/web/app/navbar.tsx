'use client'

import clsx from 'clsx'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  type ChangeEventHandler,
  type FormEventHandler,
  useCallback,
  useMemo,
  useRef,
  useState
} from 'react'
import { FaMoon, FaSun } from 'react-icons/fa'
import { title as siteName } from '@/lib/constants'
import styles from './navbar.module.css'
import Icon from './square-icon.svg'

function SearchForm(): JSX.Element {
  const router = useRouter()
  const params = useParams()
  const query = useMemo<string>(
    () => (params.queries ? decodeURIComponent(params.queries) : ''),
    [params]
  )
  const [value, setValue] = useState(() => query)
  const textFieldRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      setValue(event.target.value)
    },
    []
  )

  const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault()

      router.push(`/videos/${encodeURIComponent(value)}`)

      textFieldRef.current?.blur()
    },
    [value, router]
  )

  return (
    <form
      action="/videos"
      className={styles.form}
      method="get"
      onSubmit={handleSubmit}
      role="search"
    >
      <div className={clsx('navbar__search', styles.content)}>
        <input
          aria-label="検索"
          className={clsx('navbar__search-input', styles.input)}
          name="q"
          onChange={handleChange}
          placeholder="検索"
          ref={textFieldRef}
          type="search"
          value={value}
        />
      </div>
    </form>
  )
}

export default function Navbar(): JSX.Element {
  const [sidebarShown, setSidebarShown] = useState(false)
  const pathname = usePathname()
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

          <Link className="navbar__brand" href="/">
            <Icon
              className={clsx('navbar__logo', styles.logo)}
              height={32}
              role="img"
              width={32}
            />
            <strong className={clsx('navbar__title', styles.title)}>
              {siteName}
            </strong>
          </Link>

          <Link
            aria-current={pathname === '/about' ? 'page' : undefined}
            className={clsx('navbar__item', 'navbar__link', {
              'navbar__link--active': pathname === '/about'
            })}
            href="/about"
          >
            {`${siteName}とは`}
          </Link>

          <Link
            aria-current={pathname.startsWith('/videos') ? 'page' : undefined}
            className={clsx('navbar__item', 'navbar__link', {
              'navbar__link--active': pathname.startsWith('/videos')
            })}
            href="/videos"
          >
            動画一覧
          </Link>
        </div>

        <div className="navbar__items navbar__items--right">
          <button
            aria-label={
              theme === 'dark'
                ? 'ライトモードに切り替える'
                : 'ダークモードに切り替える'
            }
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
        className="navbar-sidebar__backdrop"
        onClick={hideSidebar}
        role="presentation"
      />

      <div className="navbar-sidebar">
        <div className="navbar-sidebar__brand">
          <Link className="navbar__brand" href="/" onClick={hideSidebar}>
            <Icon className="navbar__logo" height={32} role="img" width={32} />
            <strong className="navbar__title">{siteName}</strong>
          </Link>
        </div>
        <div className="navbar-sidebar__items">
          <div className="menu navbar-sidebar__item">
            <ul className="menu__list">
              <li className="menu__list-item">
                <Link
                  aria-current={pathname === '/' ? 'page' : undefined}
                  className={clsx('menu__link', {
                    'menu__link--active': pathname === '/'
                  })}
                  href="/"
                  onClick={hideSidebar}
                >
                  配信予定
                </Link>
              </li>
              <li className="menu__list-item">
                <Link
                  aria-current={
                    pathname.startsWith('/videos') ? 'page' : undefined
                  }
                  className={clsx('menu__link', {
                    'menu__link--active': pathname.startsWith('/videos')
                  })}
                  href="/videos"
                  onClick={hideSidebar}
                >
                  動画一覧
                </Link>
              </li>
              <li className="menu__list-item">
                <Link
                  aria-current={pathname === '/about' ? 'page' : undefined}
                  className={clsx('menu__link', {
                    'menu__link--active': pathname === '/about'
                  })}
                  href="/about"
                  onClick={hideSidebar}
                >
                  {`${siteName}とは`}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  )
}
