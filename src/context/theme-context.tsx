import localForage from 'localforage'
import React, {
  FC,
  ReactElement,
  useCallback,
  useEffect,
  useState
} from 'react'

export const ThemeContext = React.createContext({
  theme: '',
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  toggleTheme: () => {}
})

export const ThemeProvider: FC = ({ children }): ReactElement => {
  const [theme, setTheme] = useState<string>('')

  const toggleTheme = useCallback((): void => {
    const nextTheme = theme !== 'dark' ? 'dark' : ''

    localForage.setItem<string>('theme', nextTheme)

    setTheme(nextTheme)
  }, [theme])

  const handlePrefersColorSchemeChange = useCallback(
    (event: MediaQueryListEvent): void => {
      const nextTheme = event.matches ? 'dark' : ''

      localForage.setItem<string>('theme', nextTheme)

      setTheme(nextTheme)
    },
    []
  )

  useEffect(() => {
    const mediaQueryList = matchMedia('(prefers-color-scheme: dark)')

    localForage
      .getItem<string>('theme')
      .then(value => {
        const nextTheme =
          typeof value !== 'string'
            ? mediaQueryList.matches
              ? 'dark'
              : ''
            : value

        setTheme(nextTheme)
      })
      .catch(() => {
        setTheme(mediaQueryList.matches ? 'dark' : '')
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
