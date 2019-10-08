import React, {
  FC,
  ReactElement,
  useCallback,
  useEffect,
  useState
} from 'react'

export const ThemeContext = React.createContext({
  theme: '',
  toggleTheme: () => {}
})

const getCurrentTheme = (): string | null => {
  let theme: string | null = null

  try {
    theme = localStorage.getItem('theme')
  } catch {} // eslint-disable-line no-empty

  return theme
}

export const ThemeProvider: FC = ({ children }): ReactElement => {
  const [theme, setTheme] = useState<string>('')

  const toggleTheme = useCallback((): void => {
    setTheme(theme => {
      const nextTheme = theme !== 'dark' ? 'dark' : ''

      try {
        localStorage.setItem('theme', nextTheme)
      } catch (error) {
        console.error(error)
      }

      return nextTheme
    })
  }, [])

  const handlePrefersColorSchemeChange = useCallback(
    (event: MediaQueryListEvent): void => {
      const theme = event.matches ? 'dark' : ''

      try {
        localStorage.setItem('theme', theme)
      } catch (error) {
        console.error(error)
      }

      setTheme(theme)
    },
    []
  )

  useEffect(() => {
    const currentTheme = getCurrentTheme()
    const mediaQueryList = matchMedia('(prefers-color-scheme: dark)')

    setTheme(
      typeof currentTheme === 'string'
        ? currentTheme
        : mediaQueryList.matches
        ? 'dark'
        : ''
    )

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
