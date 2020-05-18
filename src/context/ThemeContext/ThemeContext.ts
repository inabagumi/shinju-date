import { createContext } from 'react'

import Theme from './Theme'

type Value = {
  theme: Theme
  toggleTheme?: () => void
}

const ThemeContext = createContext<Value>({
  theme: 'light'
})

export default ThemeContext
