import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

// WCAG 2.x の本文の基準（AA）
const MIN_CONTRAST_RATIO = 4.5

const require = createRequire(import.meta.url)
const themeCSS = readFileSync(
  require.resolve('@shinju-date/tailwind-config/theme.css'),
  'utf8',
)

type RGB = [number, number, number]

function extractColors(css: string): Map<string, string> {
  const colors = new Map<string, string>()

  for (const match of css.matchAll(
    /--color-([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi,
  )) {
    const [, name, value] = match

    if (name && value) {
      colors.set(name, value.toLowerCase())
    }
  }

  return colors
}

function getSemanticColors(): {
  dark: Map<string, string>
  light: Map<string, string>
} {
  const lightStart = themeCSS.indexOf('@theme static')
  const darkStart = themeCSS.indexOf('@media (prefers-color-scheme: dark)')

  if (lightStart < 0 || darkStart < lightStart) {
    throw new Error('theme.css のセマンティックカラーの定義が見つかりません')
  }

  return {
    dark: extractColors(themeCSS.slice(darkStart)),
    light: extractColors(themeCSS.slice(lightStart, darkStart)),
  }
}

function hexToRGB(hex: string): RGB {
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as RGB
}

// 半透明の前景色（`bg-danger/10` など）を地に重ねたときの色
function blend(foreground: RGB, background: RGB, alpha: number): RGB {
  return foreground.map(
    (value, i) => value * alpha + (background[i] ?? 0) * (1 - alpha),
  ) as RGB
}

function relativeLuminance([r, g, b]: RGB): number {
  const [lr, lg, lb] = [r, g, b].map((value) => {
    const channel = value / 255

    return channel <= 0.039_28
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  }) as RGB

  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}

function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)

  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const SEMANTIC_COLOR_NAMES = [
  'surface',
  'surface-raised',
  'surface-sunken',
  'border',
  'text',
  'text-muted',
  'accent',
  'on-accent',
  'brand',
  'on-brand',
  'live',
  'danger',
  'success',
  'warning',
]

const SURFACES = ['surface', 'surface-raised', 'surface-sunken']
const TEXT_ON_SURFACES = [
  'text',
  'text-muted',
  'accent',
  'danger',
  'success',
  'warning',
]
// Badge の地（`bg-<color>/10`）に同じ色の文字を載せる組み合わせ
const TINTED_COLORS = ['accent', 'danger', 'success', 'warning']
const TINT_ALPHA = 0.1

const { dark, light } = getSemanticColors()
const modes = [
  ['light', light],
  ['dark', dark],
] as const

function getColor(colors: Map<string, string>, name: string): RGB {
  const value = colors.get(name)

  if (!value) {
    throw new Error(`--color-${name} が定義されていません`)
  }

  return hexToRGB(value)
}

describe('semantic colors', () => {
  it.each(modes)('defines every semantic color in %s mode', (_mode, colors) => {
    expect([...colors.keys()].sort()).toEqual([...SEMANTIC_COLOR_NAMES].sort())
  })

  describe.each(modes)('%s mode', (_mode, colors) => {
    const combinations = SURFACES.flatMap((surface) =>
      TEXT_ON_SURFACES.map((text) => [text, surface] as const),
    )

    it.each(combinations)(
      `%s on %s has a contrast ratio of at least ${MIN_CONTRAST_RATIO}:1`,
      (text, surface) => {
        expect(
          contrastRatio(getColor(colors, text), getColor(colors, surface)),
        ).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO)
      },
    )

    const tintedCombinations = SURFACES.flatMap((surface) =>
      TINTED_COLORS.map((color) => [color, surface] as const),
    )

    it.each(tintedCombinations)(
      `%s on a ${TINT_ALPHA * 100}%% tint over %s has a contrast ratio of at least ${MIN_CONTRAST_RATIO}:1`,
      (color, surface) => {
        const foreground = getColor(colors, color)
        const background = blend(
          foreground,
          getColor(colors, surface),
          TINT_ALPHA,
        )

        expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(
          MIN_CONTRAST_RATIO,
        )
      },
    )

    it(`on-accent on accent has a contrast ratio of at least ${MIN_CONTRAST_RATIO}:1`, () => {
      expect(
        contrastRatio(
          getColor(colors, 'on-accent'),
          getColor(colors, 'accent'),
        ),
      ).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO)
    })

    it(`on-brand on brand has a contrast ratio of at least ${MIN_CONTRAST_RATIO}:1`, () => {
      expect(
        contrastRatio(getColor(colors, 'on-brand'), getColor(colors, 'brand')),
      ).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO)
    })

    it(`white on live has a contrast ratio of at least ${MIN_CONTRAST_RATIO}:1`, () => {
      expect(
        contrastRatio([255, 255, 255], getColor(colors, 'live')),
      ).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO)
    })
  })
})
