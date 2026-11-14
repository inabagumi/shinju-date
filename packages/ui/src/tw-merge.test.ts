import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { CONTAINERS, FONT_SIZES, twMerge } from './tw-merge'

const require = createRequire(import.meta.url)
const themeCSS = readFileSync(
  require.resolve('@shinju-date/tailwind-config/theme.css'),
  'utf8',
)

function extractThemeKeys(namespace: string): string[] {
  const keys = [
    ...themeCSS.matchAll(new RegExp(`--${namespace}-([\\w-]+):`, 'g')),
  ].flatMap(([, key]) =>
    // `--text-color-*` は文字色、`--text-*--line-height` は行間
    key && !key.startsWith('color-') && !key.includes('--') ? [key] : [],
  )

  return [...new Set(keys)].sort()
}

describe('twMerge', () => {
  it('knows every font size in theme.css', () => {
    expect([...FONT_SIZES].sort()).toEqual(extractThemeKeys('text'))
  })

  it('knows every container in theme.css', () => {
    expect([...CONTAINERS].sort()).toEqual(extractThemeKeys('container'))
  })

  it('keeps a font size together with a text color', () => {
    expect(twMerge('text-body text-foreground')).toBe(
      'text-body text-foreground',
    )
    expect(twMerge('text-meta text-muted')).toBe('text-meta text-muted')
  })

  it('replaces a font size with another one', () => {
    expect(twMerge('text-sm', 'text-meta')).toBe('text-meta')
    expect(twMerge('text-caption', 'text-heading')).toBe('text-heading')
  })

  it('keeps line height overrides after a font size', () => {
    expect(twMerge('text-body leading-normal')).toBe('text-body leading-normal')
  })

  it('replaces a max width with another one', () => {
    expect(twMerge('max-w-2xl', 'max-w-text')).toBe('max-w-text')
  })
})
