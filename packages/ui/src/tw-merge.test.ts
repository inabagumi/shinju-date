import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import {
  CONTAINERS,
  FOCUS_RINGS,
  FONT_SIZES,
  RADII,
  SHADOWS,
  twMerge,
} from './tw-merge'

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

  it('knows every radius in theme.css', () => {
    expect([...RADII].sort()).toEqual(extractThemeKeys('radius'))
  })

  it('knows every shadow in theme.css', () => {
    expect([...SHADOWS].sort()).toEqual(extractThemeKeys('shadow'))
  })

  it('knows every focus ring in theme.css', () => {
    const utilities = [
      ...themeCSS.matchAll(/@utility ([\w-]*focus-ring[\w-]*)/g),
    ]
      .map(([, name]) => name)
      .sort()

    expect([...FOCUS_RINGS].sort()).toEqual(utilities)
  })

  it('replaces a focus ring with another one', () => {
    expect(twMerge('field-focus-ring', 'field-focus-ring-danger')).toBe(
      'field-focus-ring-danger',
    )
    expect(twMerge('focus-ring', 'field-focus-ring')).toBe('field-focus-ring')
  })

  it('keeps a focus ring together with outline utilities', () => {
    expect(twMerge('focus-ring outline-none')).toBe('focus-ring outline-none')
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

  it('replaces a radius with another one', () => {
    expect(twMerge('rounded-md', 'rounded-control')).toBe('rounded-control')
    expect(twMerge('rounded-control', 'rounded-container')).toBe(
      'rounded-container',
    )
    expect(twMerge('rounded-container', 'rounded-full')).toBe('rounded-full')
  })

  it('keeps a radius on one side together with the overall radius', () => {
    expect(twMerge('rounded-container rounded-t-none')).toBe(
      'rounded-container rounded-t-none',
    )
  })

  it('replaces a shadow with another one', () => {
    expect(twMerge('shadow-lg', 'shadow-overlay')).toBe('shadow-overlay')
    expect(twMerge('shadow-overlay', 'shadow-none')).toBe('shadow-none')
  })

  it('keeps a shadow together with a shadow color', () => {
    expect(twMerge('shadow-overlay shadow-black/20')).toBe(
      'shadow-overlay shadow-black/20',
    )
  })
})
