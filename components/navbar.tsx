import clsx from 'clsx'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { type VFC, useCallback, useMemo, useState } from 'react'
import { FaMoon, FaSun } from 'react-icons/fa'
import Icon from '../assets/icon.svg'
import { getQueryValue, join as urlJoin } from '../lib/url'
import { useCurrentGroup, useGroups } from './group'
import { useBasePath } from './layout'
import styles from './navbar.module.css'
import SearchForm from './search-form'
import Skeleton from './skeleton'

const VIDEOS_PAGE_REGEXP = /\/videos(?:\/(?:\[\[[^\]]+\]\]|\[[^\]]\]))?$/

const Navbar: VFC = () => {
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
          {groups ? (
            <div className="navbar__item dropdown dropdown--hoverable">
              <Link
                href={`${basePath}${
                  isVideosPage
                    ? `/videos${query ? `/${encodeURIComponent(query)}` : ''}`
                    : ''
                }`}
              >
                <a className="navbar__link">
                  {currentGroup?.name ?? '全グループ'}
                </a>
              </Link>
              <ul className="dropdown__menu">
                <li>
                  <Link
                    href={
                      isVideosPage
                        ? `/videos${
                            query ? `/${encodeURIComponent(query)}` : ''
                          }`
                        : '/'
                    }
                  >
                    <a
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
                    >
                      全グループ
                    </a>
                  </Link>
                </li>
                {groups.map((group) => (
                  <li key={group.slug}>
                    <Link
                      href={
                        isVideosPage
                          ? urlJoin(
                              `/groups/${group.slug}/videos`,
                              query ? encodeURIComponent(query) : ''
                            )
                          : `/groups/${group.slug}`
                      }
                    >
                      <a
                        aria-current={
                          group.slug === currentGroup?.slug ? 'page' : undefined
                        }
                        className={clsx('dropdown__link', {
                          'dropdown__link--active':
                            group.slug === currentGroup?.slug
                        })}
                      >
                        {group.name}
                      </a>
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
                  配信予定
                </a>
                <ul className="menu__list">
                  <li className="menu__list-item">
                    <Link href="/">
                      <a
                        aria-current={
                          router.pathname === '/' ? 'page' : undefined
                        }
                        className={clsx('menu__link', {
                          'menu__link--active': router.pathname === '/'
                        })}
                        onClick={hideSidebar}
                      >
                        全グループ
                      </a>
                    </Link>
                  </li>
                  {groups ? (
                    groups.map((group) => (
                      <li className="menu__list-item" key={group.slug}>
                        <Link href={`/groups/${group.slug}`}>
                          <a
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
                            onClick={hideSidebar}
                          >
                            {group.name}
                          </a>
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
                      href={`/videos${
                        query ? `/${encodeURIComponent(query)}` : ''
                      }`}
                    >
                      <a
                        aria-current={
                          router.pathname === '/videos/[[...queries]]'
                            ? 'page'
                            : undefined
                        }
                        className={clsx('menu__link', {
                          'menu__link--active':
                            router.pathname === '/videos/[[...queries]]'
                        })}
                        onClick={hideSidebar}
                      >
                        全グループ
                      </a>
                    </Link>
                  </li>
                  {groups ? (
                    groups.map((group) => (
                      <li className="menu__list-item" key={group.slug}>
                        <Link
                          href={urlJoin(
                            `/groups/${group.slug}/videos`,
                            query ? `/${encodeURIComponent(query)}` : ''
                          )}
                        >
                          <a
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
                            onClick={hideSidebar}
                          >
                            {group.name}
                          </a>
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
