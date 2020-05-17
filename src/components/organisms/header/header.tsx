import clsx from 'clsx'
import Link from 'next/link'
import React, { FC, useContext, useEffect } from 'react'
import { FaMoon, FaSun } from 'react-icons/fa'
import Toggle, { ToggleIcons } from 'react-toggle'

import Logo from 'assets/logo.svg'
import SearchForm from 'components/molecules/search-form'
import { useSiteMetadata } from 'context/site-context'
import { ThemeContext } from 'context/theme-context'

import styles from './header.module.css'

const toggleIcons: ToggleIcons = {
  checked: <FaSun aria-label="ダークモードオフ" className={styles.themeIcon} />,
  unchecked: (
    <FaMoon aria-label="ダークモードオン" className={styles.themeIcon} />
  )
}

const Header: FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext)
  const { title: siteTitle } = useSiteMetadata()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <nav className="navbar navbar--fixed-top">
      <div className="navbar__inner">
        <div className="navbar__items">
          <Link href="/">
            <a
              aria-label={siteTitle}
              className="navbar__brand"
              href="/"
              tabIndex={-1}
            >
              <Logo className={clsx('navbar__logo', styles.logo)} />
            </a>
          </Link>
        </div>

        <div className="navbar__items navbar__items--right">
          <Toggle
            aria-label="ダークモード切り替え"
            checked={theme === 'dark'}
            icons={toggleIcons}
            onChange={toggleTheme}
            value="dark"
          />

          <SearchForm />
        </div>
      </div>
    </nav>
  )
}

export default Header
