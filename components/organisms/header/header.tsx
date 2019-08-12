import classNames from 'classnames'
import Link from 'next/link'
import Router from 'next/router'
import React, {
  ChangeEvent,
  FC,
  KeyboardEvent,
  MouseEvent,
  ReactElement,
  useCallback,
  useEffect,
  useState
} from 'react'
import { Helmet } from 'react-helmet'
import Toggle from 'react-toggle'
import { normalize } from '../../../lib/search'
import { getTitle } from '../../../lib/title'
import Emoji from '../../atoms/emoji'
import Logo from '../../atoms/logo'
import SearchForm from '../../molecules/search-form'

const channels = [
  {
    id: 'UC0Owc36U9lOyi9Gx9Ic-4qg',
    title: '因幡はねる'
  },
  {
    id: 'UChqYnJlFxlBi6DfRz6jRenQ',
    title: '宇森ひなこ'
  },
  {
    id: 'UC2kyQhzGOB-JPgcQX9OMgEw',
    title: '宗谷いちか'
  },
  {
    id: 'UCRvpMpzAXBRKJQuk-8-Sdvg',
    title: '日ノ隈らん'
  }
]

const Sun: FC = (): ReactElement => (
  <Emoji label="ダークモードオフ" value="☀️️" />
)
const Moon: FC = (): ReactElement => (
  <Emoji label="ダークモードオン" value="🌙" />
)

interface HeaderProps {
  query: string
}

const Header: FC<HeaderProps> = ({ query }): ReactElement => {
  const title = getTitle()
  const currentTheme =
    (typeof document !== 'undefined' &&
      document.documentElement.getAttribute('data-theme')) ||
    ''

  const [theme, setTheme] = useState<string>(currentTheme)
  const [sidebarShown, setSidebarShown] = useState<boolean>(false)
  const [filterListShown, setFilterListShown] = useState<boolean>(false)

  useEffect((): (() => void) => {
    const mediaQueryList = matchMedia('(prefers-color-scheme: dark)')
    let currentTheme: string | null = null

    try {
      currentTheme = localStorage.getItem('theme')
    } finally {
      if (typeof currentTheme === 'string') {
        setTheme(currentTheme)
      } else {
        setTheme(mediaQueryList.matches ? 'dark' : '')
      }
    }

    const handlePrefersColorSchemeChange = (): void => {
      const nextTheme = mediaQueryList.matches ? 'dark' : ''

      setTheme(nextTheme)

      try {
        localStorage.setItem('theme', nextTheme)
      } catch {}
    }

    mediaQueryList.addListener(handlePrefersColorSchemeChange)

    return (): void => {
      mediaQueryList.removeListener(handlePrefersColorSchemeChange)
    }
  }, [setTheme])

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

      Router.replace(query ? `/search?q=${encodeURIComponent(query)}` : '/')
    },
    []
  )

  const handleToggleChange = useCallback(
    ({ target }: ChangeEvent<HTMLInputElement>): void => {
      const nextTheme = target.checked ? target.value : ''

      setTheme(nextTheme)

      try {
        localStorage.setItem('theme', nextTheme)
      } catch {}
    },
    [setTheme]
  )

  return (
    <>
      <Helmet htmlAttributes={{ 'data-theme': theme }} />

      <nav
        className={classNames('navbar', 'navbar--fixed-top', {
          'navbar--sidebar-show': sidebarShown
        })}
      >
        <div className="container">
          <div className="navbar__inner">
            <div className="navbar__items">
              <div
                className="navbar__toggle"
                onClick={showSidebar}
                onKeyDown={showSidebar}
                role="button"
                tabIndex={0}
              >
                <svg
                  focusable="false"
                  height="30"
                  viewBox="0 0 30 30"
                  width="30"
                >
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
                  aria-label={title}
                  className="navbar__brand"
                  href="/"
                  tabIndex={-1}
                >
                  <Logo />
                </a>
              </Link>

              <Link href="/about">
                <a className="navbar__item navbar__link" href="/">
                  About
                </a>
              </Link>

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
            </div>

            <div className="navbar__items navbar__items--right">
              <a
                className="navbar__item navbar__link"
                href="https://github.com/inabagumi/animare-search"
                rel="noopener noreferrer"
                target="_blank"
              >
                GitHub
              </a>
              <a
                className="navbar__item navbar__link"
                href="https://forms.gle/sriuF4xAG5t2R5E97"
                rel="noopener noreferrer"
                target="_blank"
              >
                お問い合わせ
              </a>
              <Toggle
                aria-label="ダークモード切り替え"
                checked={theme === 'dark'}
                className="react-toggle--lg-only"
                icons={{
                  checked: <Sun />,
                  unchecked: <Moon />
                }}
                onChange={handleToggleChange}
                value="dark"
              />

              <SearchForm onChange={handleChange} query={query} />
            </div>
          </div>
          <div
            role="presentation"
            className="navbar__sidebar__backdrop"
            onClick={hideSidebar}
          />
          <div className="navbar__sidebar">
            <div className="navbar__sidebar__brand">
              <Link href="/">
                <a
                  aria-label={title}
                  className="navbar__brand"
                  href="/"
                  onClick={hideSidebar}
                  onKeyDown={hideSidebar}
                  tabIndex={-1}
                >
                  <Logo />
                </a>
              </Link>
              <Toggle
                aria-label="ダークモード切り替え"
                checked={theme === 'dark'}
                icons={{
                  checked: <Sun />,
                  unchecked: <Moon />
                }}
                onChange={handleToggleChange}
                value="dark"
              />
            </div>

            <div className="navbar__sidebar__items">
              <div className="menu">
                <ul className="menu__list">
                  <li className="menu__list-item">
                    <Link href="/about">
                      <a
                        className="menu__link"
                        href="/about"
                        onClick={hideSidebar}
                        onKeyDown={hideSidebar}
                      >
                        About
                      </a>
                    </Link>
                  </li>
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
                      )}{' '}
                    </ul>
                  </li>
                  <li className="menu__list-item">
                    <a
                      className="menu__link"
                      href="https://github.com/inabagumi/animare-search"
                      onClick={hideSidebar}
                      onKeyDown={hideSidebar}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      GitHub
                    </a>
                  </li>
                  <li className="menu__list-item">
                    <a
                      className="menu__link"
                      href="https://forms.gle/sriuF4xAG5t2R5E97"
                      onClick={hideSidebar}
                      onKeyDown={hideSidebar}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      お問い合わせ
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <style jsx>{`
        .navbar__brand {
          outline: none;
        }

        .navbar:not(.navbar--sidebar-show) .navbar__sidebar {
          box-shadow: none;
        }

        .navbar__link svg {
          vertical-align: middle;
        }

        /**
         * Styles for React Toggle
         * https://github.com/aaronshaf/react-toggle/blob/9a83a95da4c220a1d0b6cef11fe18a7182fa4cca/style.css
         */
        :global(.react-toggle) {
          background-color: transparent;
          border: 0;
          display: inline-block;
          cursor: pointer;
          padding: 0;
          position: relative;
          -webkit-tap-highlight: rgba(0, 0, 0, 0);
          -webkit-tap-highlight: transparent;
          touch-action: pan-x;
          -webkit-touch-callout: none;
          user-select: none;
        }

        :global(.react-toggle--lg-only) {
          display: none;
        }

        @media (min-width: 996px) {
          :global(.react-toggle--lg-only) {
            display: inline-block;
          }
        }

        :global(.react-toggle-screenreader-only) {
          border: 0;
          clip: rect(0 0 0 0);
          height: 1px;
          margin: -1px;
          overflow: hidden;
          padding: 0;
          position: absolute;
          width: 1px;
        }

        :global(.react-toggle--disabled) {
          cursor: not-allowed;
          opacity: 0.5;
          transition: opacity 0.25s;
        }

        :global(.react-toggle-track) {
          background-color: #4d4d4d;
          border-radius: 30px;
          height: 24px;
          padding: 0;
          transition: all 0.2s ease;
          width: 50px;
        }

        :global(.react-toggle-track-check) {
          bottom: 0;
          height: 10px;
          left: 8px;
          line-height: 0;
          margin-bottom: auto;
          margin-top: auto;
          opacity: 0;
          position: absolute;
          top: 0;
          transition: opacity 0.25s ease;
          width: 14px;
        }

        :global(.react-toggle--checked .react-toggle-track-check) {
          opacity: 1;
        }

        :global(.react-toggle-track-x) {
          bottom: 0;
          height: 10px;
          margin-bottom: auto;
          margin-top: auto;
          line-height: 0;
          position: absolute;
          right: 10px;
          opacity: 1;
          top: 0;
          transition: opacity 0.25s ease;
          width: 10px;
        }

        :global(.react-toggle--checked .react-toggle-track-x) {
          opacity: 0;
        }

        :global(.react-toggle-thumb) {
          background-color: #fafafa;
          border: 1px solid #4d4d4d;
          border-radius: 50%;
          box-sizing: border-box;
          height: 22px;
          left: 1px;
          position: absolute;
          top: 1px;
          transition: all 0.25s ease;
          width: 22px;
        }

        :global(.react-toggle--checked .react-toggle-thumb) {
          border-color: #0099e0;
          left: 27px;
        }

        :global(.react-toggle--focus .react-toggle-thumb) {
          box-shadow: 0 0 2px 3px #0099e0;
        }

        :global(.react-toggle:active:not(.react-toggle--disabled)
            .react-toggle-thumb) {
          box-shadow: 0 0 5px 5px #0099e0;
        }
      `}</style>
    </>
  )
}

export default Header
