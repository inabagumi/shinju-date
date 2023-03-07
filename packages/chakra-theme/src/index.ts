import { extendTheme } from '@shinju-date/chakra-ui'

const defaultFontFamily = [
  "var(--font-lato, 'Lato')",
  'Helvetica Neue',
  'Arial',
  'Hiragino Kaku Gothic ProN',
  'Hiragino Sans',
  'BIZ UDPGothic',
  'Meiryo',
  'sans-serif',
  'Apple Color Emoji',
  'Segoe UI Emoji',
  'Noto Color Emoji'
].join(', ')

export default extendTheme({
  fonts: {
    body: defaultFontFamily,
    heading: defaultFontFamily
  }
})
