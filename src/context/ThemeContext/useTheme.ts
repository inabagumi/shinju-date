import { useContext } from 'react'

import type Theme from './Theme'
import ThemeContext from './ThemeContext'

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop(): void {}

function useTheme(): [Theme, () => void] {
  const { theme, toggleTheme = noop } = useContext(ThemeContext)

  return [theme, toggleTheme]
}

export default useTheme
