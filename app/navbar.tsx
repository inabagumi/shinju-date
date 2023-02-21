'use client'

import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useCallback, useMemo, useState } from 'react'
import { FaMoon, FaSun } from 'react-icons/fa'
import { joinURL } from 'ufo'
import Icon from '@/assets/icon.svg'
import { parseQueries } from '@/lib/url'
import { useCurrentGroup, useGroupList } from '@/ui/group'
import Skeleton from '@/ui/skeleton'
import styles from './navbar.module.css'
import SearchForm from './search-form'

export default function Navbar(): JSX.Element {
  const [sidebarShown, setSidebarShown] = useState(false)
  const pathname = usePathname()
  const { setTheme, theme } = useTheme()
  const groupList = useGroupList()
  const currentGroup = useCurrentGroup()
  const isVideosPage = useMemo(
    () =>
      !!pathname &&
      (currentGroup
        ? pathname.split('/')[3] === 'videos'
        : pathname.startsWith('/videos')),
    [currentGroup, pathname]
  )
  const basePath = useMemo(
    () => (currentGroup ? `/groups/${currentGroup.slug}` : '/'),
    [currentGroup]
  )
  const query = useMemo(() => {
    if (!pathname || !isVideosPage) {
      return ''
    }

    const queries = pathname.split('/').slice(currentGroup ? 4 : 2)

    return parseQueries(queries)
  }, [pathname, isVideosPage, currentGroup])

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
            aria-current={pathname === '/about' ? 'page' : undefined}
            className={clsx('navbar__item', 'navbar__link', {
              'navbar__link--active': pathname === '/about'
            })}
            href="/about"
          >
            SHINJU DATEとは
          </Link>

          <Link
            aria-current={pathname === '/videos' ? 'page' : undefined}
            className={clsx('navbar__item', 'navbar__link', {
              'navbar__link--active': pathname === '/videos'
            })}
            href="/videos"
          >
            動画一覧
          </Link>
        </div>

        <div className="navbar__items navbar__items--right">
          {groupList.length > 0 ? (
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
              <ul className={clsx('dropdown__menu', styles.dropdownMenu)}>
                <li>
                  <Link
                    aria-current={
                      (
                        isVideosPage
                          ? pathname?.startsWith('/videos')
                          : pathname === '/'
                      )
                        ? 'page'
                        : undefined
                    }
                    className={clsx('dropdown__link', {
                      'dropdown__link--active': isVideosPage
                        ? !currentGroup
                        : pathname === '/'
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
                {groupList.map((group) => (
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

          <SearchForm basePath={basePath} query={query} />
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
                  aria-current={pathname === '/about' ? 'page' : undefined}
                  className={clsx('menu__link', {
                    'menu__link--active': pathname === '/about'
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
                      aria-current={pathname === '/' ? 'page' : undefined}
                      className={clsx('menu__link', {
                        'menu__link--active': pathname === '/'
                      })}
                      href="/"
                      onClick={hideSidebar}
                    >
                      全グループ
                    </Link>
                  </li>
                  {groupList.length > 0 ? (
                    groupList.map((group) => (
                      <li className="menu__list-item" key={group.slug}>
                        <Link
                          aria-current={
                            pathname === '/groups/[slug]' &&
                            group.slug === currentGroup?.slug
                              ? 'page'
                              : undefined
                          }
                          className={clsx('menu__link', {
                            'menu__link--active':
                              pathname === '/groups/[slug]' &&
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
                        pathname?.startsWith('/videos') ? 'page' : undefined
                      }
                      className={clsx('menu__link', {
                        'menu__link--active': pathname?.startsWith('/videos')
                      })}
                      href={`/videos${
                        query ? `/${encodeURIComponent(query)}` : ''
                      }`}
                      onClick={hideSidebar}
                    >
                      全グループ
                    </Link>
                  </li>
                  {groupList.length > 0 ? (
                    groupList.map((group) => (
                      <li className="menu__list-item" key={group.slug}>
                        <Link
                          aria-current={
                            currentGroup &&
                            isVideosPage &&
                            group.slug === currentGroup.slug
                              ? 'page'
                              : undefined
                          }
                          className={clsx('menu__link', {
                            'menu__link--active':
                              currentGroup &&
                              isVideosPage &&
                              group.slug === currentGroup.slug
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
