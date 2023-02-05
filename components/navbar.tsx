import clsx from 'clsx'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTheme } from 'next-themes'
import { type FC, useCallback, useMemo, useState } from 'react'
import { FaMoon, FaSun } from 'react-icons/fa'
import { joinURL } from 'ufo'
import Icon from '../assets/icon.svg'
import { getQueryValue } from '../lib/url'
import { useCurrentGroup, useGroups } from './group'
import { useBasePath } from './layout'
import styles from './navbar.module.css'
import SearchForm from './search-form'
import Skeleton from './skeleton'

const VIDEOS_PAGE_REGEXP = /\/videos(?:\/(?:\[\[[^\]]+\]\]|\[[^\]]\]))?$/

const Navbar: FC = () => {
  const [sidebarShown, setSidebarShown] = useState(false)
  const router = useRouter()
  const { setTheme, theme } = useTheme()
  const basePath = useBasePath()
  const groups = useGroups()
  const [currentGroup] = useCurrentGroup()
  const isVideosPage = useMemo(
    () => VIDEOS_PAGE_REGEXP.test(router.pathname),
    [router.pathname]
  )
  const query = useMemo(
    () => getQueryValue('queries', router.query),
    [router.query]
  )

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
              SHINJU DATE
            </strong>
          </Link>

          <Link
            aria-current={router.pathname === '/about' ? 'page' : undefined}
            className={clsx('navbar__item', 'navbar__link', {
              'navbar__link--active': router.pathname === '/about'
            })}
            href="/about"
          >
            SHINJU DATEとは
          </Link>

          <Link
            aria-current={router.pathname === '/videos' ? 'page' : undefined}
            className={clsx('navbar__item', 'navbar__link', {
              'navbar__link--active': router.pathname === '/videos'
            })}
            href="/videos"
          >
            動画一覧
          </Link>
        </div>

        <div className="navbar__items navbar__items--right">
          {groups ? (
            <div className="navbar__item dropdown dropdown--hoverable">
              <Link
                className="navbar__link"
                href={joinURL(
                  basePath,
                  ...(isVideosPage
                    ? ['videos', query ? encodeURIComponent(query) : '']
                    : [])
                )}
              >
                {currentGroup?.name ?? '全グループ'}
              </Link>
              <ul className="dropdown__menu">
                <li>
                  <Link
                    aria-current={
                      (
                        isVideosPage
                          ? router.pathname.startsWith('/videos')
                          : router.pathname === '/'
                      )
                        ? 'page'
                        : undefined
                    }
                    className={clsx('dropdown__link', {
                      'dropdown__link--active': isVideosPage
                        ? router.pathname.startsWith('/videos')
                        : router.pathname === '/'
                    })}
                    href={
                      isVideosPage
                        ? `/videos${
                            query ? `/${encodeURIComponent(query)}` : ''
                          }`
                        : '/'
                    }
                  >
                    全グループ
                  </Link>
                </li>
                {groups.map((group) => (
                  <li key={group.slug}>
                    <Link
                      aria-current={
                        group.slug === currentGroup?.slug ? 'page' : undefined
                      }
                      className={clsx('dropdown__link', {
                        'dropdown__link--active':
                          group.slug === currentGroup?.slug
                      })}
                      href={
                        isVideosPage
                          ? joinURL(
                              `/groups/${group.slug}/videos`,
                              query ? encodeURIComponent(query) : ''
                            )
                          : `/groups/${group.slug}`
                      }
                    >
                      {group.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="navbar__item dropdown dropdown--hoverable">
              <a className="navbar__link" role="button">
                <Skeleton variant="text" />
              </a>
              <ul className="dropdown__menu">
                <li>
                  <a className="dropdown__link">
                    <Skeleton variant="text" />
                  </a>
                </li>
                <li>
                  <a className="dropdown__link">
                    <Skeleton variant="text" />
                  </a>
                </li>
                <li>
                  <a className="dropdown__link">
                    <Skeleton variant="text" />
                  </a>
                </li>
              </ul>
            </div>
          )}

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
        className="navbar-sidebar__backdrop"
        onClick={hideSidebar}
        role="presentation"
      />

      <div className="navbar-sidebar">
        <div className="navbar-sidebar__brand">
          <Link className="navbar__brand" href="/" onClick={hideSidebar}>
            <Icon className="navbar__logo" height={32} role="img" width={32} />
            <strong className="navbar__title">SHINJU DATE</strong>
          </Link>
        </div>
        <div className="navbar-sidebar__items">
          <div className="menu navbar-sidebar__item">
            <ul className="menu__list">
              <li className="menu__list-item">
                <Link
                  aria-current={
                    router.pathname === '/about' ? 'page' : undefined
                  }
                  className={clsx('menu__link', {
                    'menu__link--active': router.pathname === '/about'
                  })}
                  href="/about"
                  onClick={hideSidebar}
                >
                  SHINJU DATEとは
                </Link>
              </li>
              <li className="menu__list-item">
                <a className="menu__link menu__link--sublist" role="button">
                  配信予定
                </a>
                <ul className="menu__list">
                  <li className="menu__list-item">
                    <Link
                      aria-current={
                        router.pathname === '/' ? 'page' : undefined
                      }
                      className={clsx('menu__link', {
                        'menu__link--active': router.pathname === '/'
                      })}
                      href="/"
                      onClick={hideSidebar}
                    >
                      全グループ
                    </Link>
                  </li>
                  {groups ? (
                    groups.map((group) => (
                      <li className="menu__list-item" key={group.slug}>
                        <Link
                          aria-current={
                            router.pathname === '/groups/[slug]' &&
                            group.slug === currentGroup?.slug
                              ? 'page'
                              : undefined
                          }
                          className={clsx('menu__link', {
                            'menu__link--active':
                              router.pathname === '/groups/[slug]' &&
                              group.slug === currentGroup?.slug
                          })}
                          href={`/groups/${group.slug}`}
                          onClick={hideSidebar}
                        >
                          {group.name}
                        </Link>
                      </li>
                    ))
                  ) : (
                    <>
                      <li className="menu__list-item">
                        <a className="menu__link">
                          <Skeleton variant="text" />
                        </a>
                      </li>
                      <li className="menu__list-item">
                        <a className="menu__link">
                          <Skeleton variant="text" />
                        </a>
                      </li>
                      <li className="menu__list-item">
                        <a className="menu__link">
                          <Skeleton variant="text" />
                        </a>
                      </li>
                    </>
                  )}
                </ul>
              </li>
              <li className="menu__list-item">
                <a className="menu__link menu__link--sublist" role="button">
                  動画一覧
                </a>
                <ul className="menu__list">
                  <li className="menu__list-item">
                    <Link
                      aria-current={
                        router.pathname === '/videos/[[...queries]]'
                          ? 'page'
                          : undefined
                      }
                      className={clsx('menu__link', {
                        'menu__link--active':
                          router.pathname === '/videos/[[...queries]]'
                      })}
                      href={`/videos${
                        query ? `/${encodeURIComponent(query)}` : ''
                      }`}
                      onClick={hideSidebar}
                    >
                      全グループ
                    </Link>
                  </li>
                  {groups ? (
                    groups.map((group) => (
                      <li className="menu__list-item" key={group.slug}>
                        <Link
                          aria-current={
                            [
                              '/groups/[slug]/videos',
                              '/groups/[slug]/videos/[...queries]'
                            ].includes(router.pathname) &&
                            group.slug === currentGroup?.slug
                              ? 'page'
                              : undefined
                          }
                          className={clsx('menu__link', {
                            'menu__link--active':
                              [
                                '/groups/[slug]/videos',
                                '/groups/[slug]/videos/[...queries]'
                              ].includes(router.pathname) &&
                              group.slug === currentGroup?.slug
                          })}
                          href={joinURL(
                            `/groups/${group.slug}/videos`,
                            query ? `/${encodeURIComponent(query)}` : ''
                          )}
                          onClick={hideSidebar}
                        >
                          {group.name}
                        </Link>
                      </li>
                    ))
                  ) : (
                    <>
                      <li className="menu__list-item">
                        <a className="menu__link">
                          <Skeleton variant="text" />
                        </a>
                      </li>
                      <li className="menu__list-item">
                        <a className="menu__link">
                          <Skeleton variant="text" />
                        </a>
                      </li>
                      <li className="menu__list-item">
                        <a className="menu__link">
                          <Skeleton variant="text" />
                        </a>
                      </li>
                    </>
                  )}
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
