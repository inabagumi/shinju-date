import localForage from 'localforage'
import { FC, useCallback, useEffect, useState } from 'react'

import type Theme from './Theme'
import ThemeContext from './ThemeContext'

export const ThemeProvider: FC = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light')

  const toggleTheme = useCallback((): void => {
    const nextTheme = theme !== 'dark' ? 'dark' : 'light'

    localForage
      .setItem<Theme>('theme', nextTheme)
      .then(() => {
        setTheme(nextTheme)
      })
      .catch((error) => {
        console.error(error)
      })
  }, [theme])

  const handlePrefersColorSchemeChange = useCallback(
    (event: MediaQueryListEvent): void => {
      const nextTheme = event.matches ? 'dark' : 'light'

      localForage
        .setItem<Theme>('theme', nextTheme)
        .then(() => {
          setTheme(nextTheme)
        })
        .catch((error) => {
          console.error(error)
        })
    },
    []
  )

  useEffect(() => {
    const mediaQueryList = matchMedia('(prefers-color-scheme: dark)')

    localForage
      .getItem<Theme>('theme')
      .then((value) => {
        const nextTheme =
          typeof value !== 'string'
            ? mediaQueryList.matches
              ? 'dark'
              : 'light'
            : value

        setTheme(nextTheme)
      })
      .catch(() => {
        setTheme(mediaQueryList.matches ? 'dark' : 'light')
      })

    mediaQueryList.addListener(handlePrefersColorSchemeChange)

    return (): void => {
      mediaQueryList.removeListener(handlePrefersColorSchemeChange)
    }
  }, [handlePrefersColorSchemeChange])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeProvider
