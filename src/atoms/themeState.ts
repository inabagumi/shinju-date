import { atom } from 'recoil'

export type Theme = 'light' | 'dark'

const themeState = atom<Theme>({
  default: 'light',
  key: 'themeState'
})

export default themeState
