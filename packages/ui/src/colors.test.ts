import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

// WCAG 2.x の本文の基準（AA）
const MIN_CONTRAST_RATIO = 4.5

const DARK_MODE_QUERY = '@media (prefers-color-scheme: dark)'
const SEMANTIC_COLORS_START = '@theme static'

const require = createRequire(import.meta.url)
const themeCSS = readFileSync(
  require.resolve('@shinju-date/tailwind-config/theme.css'),
  'utf8',
)
const tailwindThemeCSS = readFileSync(
  require.resolve('tailwindcss/theme.css'),
  'utf8',
)

// sRGB の線形値（0〜1）
type LinearRGB = [number, number, number]

function extractDeclarations(css: string): Map<string, string> {
  const declarations = new Map<string, string>()

  for (const match of css.matchAll(/--color-([\w-]+):\s*([^;]+);/g)) {
    const [, name, value] = match

    if (name && value) {
      declarations.set(name, value.trim())
    }
  }

  return declarations
}

const semanticStart = themeCSS.indexOf(SEMANTIC_COLORS_START)
const darkStart = themeCSS.indexOf(DARK_MODE_QUERY)

if (semanticStart < 0 || darkStart < semanticStart) {
  throw new Error('theme.css のセマンティックカラーの定義が見つかりません')
}

const lightDeclarations = extractDeclarations(
  themeCSS.slice(semanticStart, darkStart),
)
const darkDeclarations = extractDeclarations(themeCSS.slice(darkStart))
const palette = new Map([
  ...extractDeclarations(tailwindThemeCSS),
  ...extractDeclarations(themeCSS.slice(0, semanticStart)),
])
const modes = [
  ['light', new Map([...palette, ...lightDeclarations])],
  ['dark', new Map([...palette, ...lightDeclarations, ...darkDeclarations])],
] as const

function srgbToLinear(value: number): number {
  return value <= 0.040_45 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

function linearToSRGB(value: number): number {
  return value <= 0.003_130_8
    ? value * 12.92
    : 1.055 * value ** (1 / 2.4) - 0.055
}

function parseHex(hex: string): LinearRGB {
  const digits =
    hex.length === 4
      ? [...hex.slice(1)].map((digit) => digit + digit)
      : [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)]

  return digits.map((digit) =>
    srgbToLinear(Number.parseInt(digit, 16) / 255),
  ) as LinearRGB
}

// https://bottosson.github.io/posts/oklab/
function parseOklch(lightness: number, chroma: number, hue: number): LinearRGB {
  const radian = (hue * Math.PI) / 180
  const a = chroma * Math.cos(radian)
  const b = chroma * Math.sin(radian)
  const l = (lightness + 0.396_337_777_4 * a + 0.215_803_757_3 * b) ** 3
  const m = (lightness - 0.105_561_345_8 * a - 0.063_854_172_8 * b) ** 3
  const s = (lightness - 0.089_484_177_5 * a - 1.291_485_548 * b) ** 3

  return [
    4.076_741_662_1 * l - 3.307_711_591_3 * m + 0.230_969_929_2 * s,
    -1.268_438_004_6 * l + 2.609_757_401_1 * m - 0.341_319_396_5 * s,
    -0.004_196_086_3 * l - 0.703_418_614_7 * m + 1.707_614_701 * s,
  ].map((value) => Math.min(1, Math.max(0, value))) as LinearRGB
}

function resolveColor(colors: Map<string, string>, name: string): LinearRGB {
  const value = colors.get(name)

  if (!value) {
    throw new Error(`--color-${name} が定義されていません`)
  }

  const reference = value.match(/^var\(--color-([\w-]+)\)$/)

  if (reference?.[1]) {
    return resolveColor(colors, reference[1])
  }

  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
    return parseHex(value)
  }

  const oklch = value.match(/^oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+|none)\)$/)

  if (oklch?.[1] && oklch[2] && oklch[3]) {
    return parseOklch(
      Number(oklch[1]) / 100,
      Number(oklch[2]),
      oklch[3] === 'none' ? 0 : Number(oklch[3]),
    )
  }

  throw new Error(`--color-${name} の値を解釈できません: ${value}`)
}

// 半透明の前景色（`bg-danger/10` など）を地に重ねたときの色
function blend(
  foreground: LinearRGB,
  background: LinearRGB,
  alpha: number,
): LinearRGB {
  return foreground.map((value, i) =>
    srgbToLinear(
      linearToSRGB(value) * alpha +
        linearToSRGB(background[i] ?? 0) * (1 - alpha),
    ),
  ) as LinearRGB
}

function contrastRatio(a: LinearRGB, b: LinearRGB): number {
  const luminance = ([r, g, b]: LinearRGB) =>
    0.2126 * r + 0.7152 * g + 0.0722 * b
  const la = luminance(a)
  const lb = luminance(b)

  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const SEMANTIC_COLOR_NAMES = [
  'background',
  'foreground',
  'surface',
  'muted',
  'muted-foreground',
  'border',
  'accent',
  'accent-foreground',
  'live',
  'live-foreground',
  'danger',
  'success',
  'warning',
]

const GROUNDS = ['background', 'surface', 'muted']
const TEXT_ON_GROUNDS = [
  'foreground',
  'muted-foreground',
  'accent',
  'danger',
  'success',
  'warning',
]
// Badge の地（`bg-<color>/10`）に同じ色の文字を載せる組み合わせ
const TINTED_COLORS = ['accent', 'danger', 'success', 'warning']
const TINT_ALPHA = 0.1
const FOREGROUND_PAIRS = [
  ['accent-foreground', 'accent'],
  ['live-foreground', 'live'],
  ['primary-foreground', 'primary'],
] as const

describe('semantic colors', () => {
  it('defines every semantic color for light mode', () => {
    expect([...lightDeclarations.keys()].sort()).toEqual(
      [...SEMANTIC_COLOR_NAMES].sort(),
    )
  })

  it('overrides only semantic colors for dark mode', () => {
    for (const name of darkDeclarations.keys()) {
      expect(SEMANTIC_COLOR_NAMES).toContain(name)
    }
  })

  it.each([...lightDeclarations, ...darkDeclarations])(
    '--color-%s refers to an existing color with var()',
    (_name, value) => {
      expect(value).toMatch(/^var\(--color-[\w-]+\)$/)
    },
  )

  it('lets apps without dark mode support pin the light values', () => {
    expect(themeCSS.slice(darkStart)).toContain(
      ":root:not([data-color-scheme='light'])",
    )
  })

  describe.each(modes)('%s mode', (_mode, colors) => {
    const combinations = GROUNDS.flatMap((ground) =>
      TEXT_ON_GROUNDS.map((text) => [text, ground] as const),
    )

    it.each(combinations)(
      `%s on %s has a contrast ratio of at least ${MIN_CONTRAST_RATIO}:1`,
      (text, ground) => {
        expect(
          contrastRatio(
            resolveColor(colors, text),
            resolveColor(colors, ground),
          ),
        ).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO)
      },
    )

    const tintedCombinations = GROUNDS.flatMap((ground) =>
      TINTED_COLORS.map((color) => [color, ground] as const),
    )

    it.each(tintedCombinations)(
      `%s on a tint of itself over %s has a contrast ratio of at least ${MIN_CONTRAST_RATIO}:1`,
      (color, ground) => {
        const foreground = resolveColor(colors, color)
        const background = blend(
          foreground,
          resolveColor(colors, ground),
          TINT_ALPHA,
        )

        expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(
          MIN_CONTRAST_RATIO,
        )
      },
    )

    it.each(FOREGROUND_PAIRS)(
      `%s on %s has a contrast ratio of at least ${MIN_CONTRAST_RATIO}:1`,
      (text, ground) => {
        expect(
          contrastRatio(
            resolveColor(colors, text),
            resolveColor(colors, ground),
          ),
        ).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO)
      },
    )
  })
})
