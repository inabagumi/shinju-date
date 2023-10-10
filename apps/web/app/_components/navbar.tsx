'use client'

import clsx from 'clsx'
import Link, { type LinkProps } from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  type MouseEventHandler,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useState
} from 'react'
import { FaMoon, FaSun } from 'react-icons/fa'
import styles from './navbar.module.css'

type NavbarContextValue = {
  setSidebarShown: (value: boolean) => void
  sidebarShown: boolean
}

const NavbarContext = createContext<NavbarContextValue>({
  setSidebarShown: () => {},
  sidebarShown: false
})

function useNavbarContext() {
  return useContext(NavbarContext)
}

export function ThemeToggleButton() {
  const { setTheme, theme } = useTheme()

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [setTheme, theme])

  return (
    <button
      aria-label={
        theme === 'dark'
          ? 'ライトモードに切り替える'
          : 'ダークモードに切り替える'
      }
      className={clsx('navbar__item', 'navbar__link', styles.navbarButton)}
      onClick={toggleTheme}
      type="button"
    >
      {theme === 'dark' ? <FaSun /> : <FaMoon />}
    </button>
  )
}

export function NavbarInner({ children }: { children: ReactNode }) {
  return <div className="navbar__inner">{children}</div>
}

export function NavbarItems({
  children,
  right = false
}: {
  children: ReactNode
  right?: boolean
}) {
  return (
    <div className={clsx('navbar__items', { 'navbar__items--right': right })}>
      {children}
    </div>
  )
}

export function NavbarToggle() {
  const { setSidebarShown } = useNavbarContext()
  const showSidebar = useCallback(() => {
    setSidebarShown(true)
  }, [setSidebarShown])

  return (
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
  )
}

export function NavbarBrand({
  children,
  ...props
}: LinkProps & { children: ReactNode }) {
  return (
    <Link className="navbar__brand" {...props}>
      <svg
        className={clsx('navbar__logo', styles.logo)}
        height={32}
        role="img"
        width={32}
      >
        <use xlinkHref="#svg-symbols-square-icon" />
      </svg>
      <strong className={clsx('navbar__title', styles.title)}>
        {children}
      </strong>
    </Link>
  )
}

export function NavbarItem({
  href,
  ...props
}: LinkProps & { children: ReactNode }) {
  const pathname = usePathname()
  const url = typeof href === 'string' ? href : href.pathname
  const isActive = pathname === url

  return (
    <Link
      aria-current={isActive ? 'page' : undefined}
      className={clsx('navbar__item', 'navbar__link', {
        'navbar__link--active': isActive
      })}
      href={href}
      {...props}
    />
  )
}

export function NavbarSidebar({ children }: { children: ReactNode }) {
  const { setSidebarShown } = useNavbarContext()
  const hideSidebar = useCallback(() => {
    setSidebarShown(false)
  }, [setSidebarShown])

  return (
    <>
      <div
        className="navbar-sidebar__backdrop"
        onClick={hideSidebar}
        role="presentation"
      />

      <div className="navbar-sidebar">{children}</div>
    </>
  )
}

export function NavbarSidebarBrand({
  onClick,
  ...props
}: LinkProps & { children: ReactNode }) {
  const { setSidebarShown } = useNavbarContext()
  const hideSidebar = useCallback(() => {
    setSidebarShown(false)
  }, [setSidebarShown])

  const handleClick = useCallback<MouseEventHandler<HTMLAnchorElement>>(
    (event) => {
      if (typeof onClick === 'function') {
        onClick(event)
      }

      hideSidebar()
    },
    [hideSidebar, onClick]
  )

  return (
    <div className="navbar-sidebar__brand">
      <NavbarBrand onClick={handleClick} {...props} />
    </div>
  )
}

export function NavbarSidebarMenu({ children }: { children: ReactNode }) {
  return (
    <div className="navbar-sidebar__items">
      <div className="menu navbar-sidebar__item">
        <ul className="menu__list">{children}</ul>
      </div>
    </div>
  )
}

export function NavbarSidebarMenuItem({
  children,
  href,
  onClick,
  ...props
}: LinkProps & { children: ReactNode }) {
  const pathname = usePathname()
  const { setSidebarShown } = useNavbarContext()
  const hideSidebar = useCallback(() => {
    setSidebarShown(false)
  }, [setSidebarShown])

  const handleClick = useCallback<MouseEventHandler<HTMLAnchorElement>>(
    (event) => {
      if (typeof onClick === 'function') {
        onClick(event)
      }

      hideSidebar()
    },
    [hideSidebar, onClick]
  )

  const url = typeof href === 'string' ? href : href.pathname
  const isActive = pathname === url

  return (
    <li className="menu__list-item">
      <Link
        aria-current={isActive ? 'page' : undefined}
        className={clsx('menu__link', {
          'menu__link--active': isActive
        })}
        href="/"
        onClick={handleClick}
        {...props}
      >
        {children}
      </Link>
    </li>
  )
}

export default function Navbar({ children }: { children: ReactNode }) {
  const [sidebarShown, setSidebarShown] = useState(false)

  return (
    <NavbarContext.Provider value={{ setSidebarShown, sidebarShown }}>
      <nav
        className={clsx('navbar', 'navbar--fixed-top', {
          'navbar-sidebar--show': sidebarShown
        })}
      >
        {children}
      </nav>
    </NavbarContext.Provider>
  )
}
