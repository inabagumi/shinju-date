import classNames from 'classnames'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React, {
  ChangeEvent,
  FC,
  KeyboardEvent,
  MouseEvent,
  ReactElement,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'
import Toggle from 'react-toggle'
import { SiteContext } from '../../../context/site-context'
import { ThemeContext } from '../../../context/theme-context'
import normalize from '../../../lib/normalize'
import Logo from '../../atoms/logo'
import SearchForm from '../../molecules/search-form'
import Moon from './moon'
import Sun from './sun'

const channels = [
  {
    id: 'UCRvpMpzAXBRKJQuk-8-Sdvg',
    title: '日ノ隈らん'
  },
  {
    id: 'UC0Owc36U9lOyi9Gx9Ic-4qg',
    title: '因幡はねる'
  },
  {
    id: 'UC2kyQhzGOB-JPgcQX9OMgEw',
    title: '宗谷いちか'
  },
  {
    id: 'UCXp7sNC0F_qkjickvlYkg-Q',
    title: '風見くく'
  },
  {
    id: 'UCW8WKciBixmaqaGqrlTITRQ',
    title: '柚原いづみ'
  },
  {
    id: 'UCDh2bWI5EDu7PavqwICkVpA',
    title: '堰代ミコ'
  },
  {
    id: 'UCeLzT-7b2PBcunJplmWtoDg',
    title: '周防パトラ'
  },
  {
    id: 'UCYTz3uIgwVY3ZU-IQJS8r3A',
    title: '島村シャルロット'
  },
  {
    id: 'UCwePpiw1ocZRSNSkpKvVISw',
    title: '西園寺メアリ'
  },
  {
    id: 'UC--A2dwZW7-M2kID0N6_lfA',
    title: '獅子王クリス'
  },
  {
    id: 'UC2hc-00y-MSR6eYA4eQ4tjQ',
    title: '龍ヶ崎リン'
  },
  {
    id: 'UCvPPBoTOor5gm8zSlE2tg4w',
    title: '虎城アンナ'
  },
  {
    id: 'UC3EhsuKdEkI99TWZwZgWutg',
    title: '杏戸ゆげ'
  },
  {
    id: 'UCL-2thbJ7grC9fmGF4OLuTg',
    title: '鴨見カモミ'
  },
  {
    id: 'UChXm-xAYPfygrbyLo2yCASQ',
    title: '季咲あんこ'
  },
  {
    id: 'UCmqrvfLMws-GLGHQcB5dasg',
    title: '花奏かのん'
  }
]

interface HeaderProps {
  query: string
}

const Header: FC<HeaderProps> = ({ query }): ReactElement => {
  const { title: siteTitle } = useContext(SiteContext)
  const { theme, toggleTheme } = useContext(ThemeContext)
  const [sidebarShown, setSidebarShown] = useState<boolean>(false)
  const [filterListShown, setFilterListShown] = useState<boolean>(false)
  const router = useRouter()

  const showSidebar = useCallback((): void => {
    setSidebarShown(true)
  }, [setSidebarShown])

  const hideSidebar = useCallback((): void => {
    setSidebarShown(false)
  }, [setSidebarShown])

  const toggleFilterListShown = useCallback(
    (
      event: KeyboardEvent<HTMLAnchorElement> | MouseEvent<HTMLAnchorElement>
    ): void => {
      event.preventDefault()

      setFilterListShown(
        (beforeFilterListShown): boolean => !beforeFilterListShown
      )
    },
    [setFilterListShown]
  )

  const handleChange = useCallback(
    ({ target }: ChangeEvent<HTMLInputElement>): void => {
      const query = normalize(target.value)

      router.replace(query ? `/search?q=${encodeURIComponent(query)}` : '/')
    },
    [router]
  )

  useEffect((): void => {
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
            <div className="dropdown dropdown--hoverable navbar__item">
              <a
                className="navbar__link"
                href="/"
                onClick={(event): void => {
                  event.preventDefault()
                }}
                onKeyDown={(event): void => {
                  event.preventDefault()
                }}
              >
                フィルター
              </a>

              <ul className="dropdown__menu">
                {channels.map(
                  (channel): ReactElement => (
                    <li key={channel.id}>
                      <Link href={`/search?q=+from:${channel.id}`}>
                        <a
                          className="dropdown__link"
                          href={`/search?q=+from:${channel.id}`}
                        >
                          {channel.title}
                        </a>
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>

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

            <SearchForm onChange={handleChange} query={query} />
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
                <li
                  className={classNames('menu__list-item', {
                    'menu__list-item--collapsed': !filterListShown
                  })}
                >
                  <a
                    className="menu__link menu__link--sublist"
                    href="/"
                    onClick={toggleFilterListShown}
                    onKeyDown={toggleFilterListShown}
                    role="button"
                  >
                    フィルター
                  </a>
                  <ul className="menu__list">
                    {channels.map(
                      (channel): ReactElement => (
                        <li key={channel.id}>
                          <Link href={`/search?q=+from:${channel.id}`}>
                            <a
                              className="menu__link"
                              href={`/search?q=+from:${channel.id}`}
                              onClick={hideSidebar}
                              onKeyDown={hideSidebar}
                            >
                              {channel.title}
                            </a>
                          </Link>
                        </li>
                      )
                    )}
                  </ul>
                </li>
              </ul>
            </div>
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

        .navbar-sidebar__brand + .navbar-sidebar__items {
          flex-grow: 1;
          flex-shrink: 0;
        }

        .navbar :global(.navbar__logo) {
          width: auto;
        }
      `}</style>
    </>
  )
}

export default Header
