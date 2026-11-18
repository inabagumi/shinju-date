import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

// WCAG 2.x の本文の基準（AA）
const MIN_CONTRAST_RATIO = 4.5;
// WCAG 2.x の、文字以外（フォーカスの線など）の基準（AA）
const MIN_NON_TEXT_CONTRAST_RATIO = 3;

const DARK_MODE_QUERY = "@media (prefers-color-scheme: dark)";
const SEMANTIC_COLORS_START = "@theme static";

const require = createRequire(import.meta.url);
const themeCSS = readFileSync(
  require.resolve("@shinju-date/tailwind-config/theme.css"),
  "utf-8"
);
const tailwindThemeCSS = readFileSync(
  require.resolve("tailwindcss/theme.css"),
  "utf-8"
);

// sRGB の線形値（0〜1）
type LinearRGB = [number, number, number];

function extractDeclarations(css: string): Map<string, string> {
  const declarations = new Map<string, string>();

  // `--color-*` と、`text-*` だけに効く `--text-color-*`
  for (const match of css.matchAll(/(--(?:text-)?color-[\w-]+):\s*([^;]+);/g)) {
    const [, name, value] = match;

    if (name && value) {
      declarations.set(name, value.trim());
    }
  }

  return declarations;
}

const semanticStart = themeCSS.indexOf(SEMANTIC_COLORS_START);
const darkStart = themeCSS.indexOf(DARK_MODE_QUERY);

if (semanticStart === -1 || darkStart < semanticStart) {
  throw new Error("theme.css のセマンティックカラーの定義が見つかりません");
}

const lightDeclarations = extractDeclarations(
  themeCSS.slice(semanticStart, darkStart)
);
const darkDeclarations = extractDeclarations(themeCSS.slice(darkStart));
const palette = new Map([
  ...extractDeclarations(tailwindThemeCSS),
  ...extractDeclarations(themeCSS.slice(0, semanticStart)),
]);
const modes = [
  ["light", new Map([...palette, ...lightDeclarations])],
  ["dark", new Map([...palette, ...lightDeclarations, ...darkDeclarations])],
] as const;

function srgbToLinear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function linearToSRGB(value: number): number {
  return value <= 0.0031308
    ? value * 12.92
    : 1.055 * value ** (1 / 2.4) - 0.055;
}

function parseHex(hex: string): LinearRGB {
  const digits =
    hex.length === 4
      ? [...hex.slice(1)].map((digit) => digit + digit)
      : [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)];

  return digits.map((digit) =>
    srgbToLinear(Number.parseInt(digit, 16) / 255)
  ) as LinearRGB;
}

// https://bottosson.github.io/posts/oklab/
function parseOklch(lightness: number, chroma: number, hue: number): LinearRGB {
  const radian = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radian);
  const b = chroma * Math.sin(radian);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((value) => Math.min(1, Math.max(0, value))) as LinearRGB;
}

function resolveColor(colors: Map<string, string>, name: string): LinearRGB {
  const value = colors.get(name);

  if (!value) {
    throw new Error(`${name} が定義されていません`);
  }

  const reference = value.match(/^var\((--[\w-]+)\)$/);

  if (reference?.[1]) {
    return resolveColor(colors, reference[1]);
  }

  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
    return parseHex(value);
  }

  const oklch = value.match(/^oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+|none)\)$/);

  if (oklch?.[1] && oklch[2] && oklch[3]) {
    return parseOklch(
      Number(oklch[1]) / 100,
      Number(oklch[2]),
      oklch[3] === "none" ? 0 : Number(oklch[3])
    );
  }

  throw new Error(`${name} の値を解釈できません: ${value}`);
}

// 半透明の前景色（`bg-danger/10` など）を地に重ねたときの色
function blend(
  foreground: LinearRGB,
  background: LinearRGB,
  alpha: number
): LinearRGB {
  return foreground.map((value, i) =>
    srgbToLinear(
      linearToSRGB(value) * alpha +
        linearToSRGB(background[i] ?? 0) * (1 - alpha)
    )
  ) as LinearRGB;
}

function contrastRatio(a: LinearRGB, b: LinearRGB): number {
  const luminance = ([r, g, b]: LinearRGB) =>
    0.2126 * r + 0.7152 * g + 0.0722 * b;
  const la = luminance(a);
  const lb = luminance(b);

  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const SEMANTIC_COLOR_NAMES = [
  "--color-primary",
  "--color-primary-foreground",
  "--color-secondary-pink",
  "--color-secondary-pink-foreground",
  "--color-secondary-blue",
  "--color-secondary-blue-foreground",
  "--color-background",
  "--color-foreground",
  "--color-surface",
  "--color-muted",
  "--text-color-muted",
  "--color-border",
  "--color-accent",
  "--color-accent-foreground",
  "--color-live",
  "--color-live-foreground",
  "--color-twitch",
  "--color-twitch-foreground",
  "--color-danger",
  "--color-success",
  "--color-warning",
];

const GROUNDS = ["--color-background", "--color-surface", "--color-muted"];
const TEXT_ON_GROUNDS = [
  "--color-foreground",
  "--text-color-muted",
  "--color-accent",
  "--color-danger",
  "--color-success",
  "--color-warning",
];
// Badge の地（`bg-<color>/10`）に同じ色の文字を載せる組み合わせ
const TINTED_COLORS = [
  "--color-accent",
  "--color-danger",
  "--color-success",
  "--color-warning",
];
const TINT_ALPHA = 0.1;
// Alert の地（`bg-<color>/10`）に本文（`text-foreground`）を載せる組み合わせ
const ALERT_TINTED_COLORS = [
  "--color-danger",
  "--color-success",
  "--color-warning",
];
// フォーカスの線（theme.css の `focus-ring` などの `@utility`）の色
const FOCUS_RING_COLORS = ["--color-accent", "--color-danger"];
const FOREGROUND_PAIRS = [
  ["--color-accent-foreground", "--color-accent"],
  ["--color-live-foreground", "--color-live"],
  ["--color-twitch-foreground", "--color-twitch"],
  ["--color-primary-foreground", "--color-primary"],
] as const;

describe("semantic colors", () => {
  it("defines every semantic color for light mode", () => {
    expect([...lightDeclarations.keys()].sort()).toStrictEqual(
      [...SEMANTIC_COLOR_NAMES].sort()
    );
  });

  it("overrides only semantic colors for dark mode", () => {
    for (const name of darkDeclarations.keys()) {
      expect(SEMANTIC_COLOR_NAMES).toContain(name);
    }
  });

  it.each([...lightDeclarations, ...darkDeclarations])(
    "%s refers to an existing color with var()",
    (_name, value) => {
      expect(value).toMatch(/^var\(--color-[\w-]+\)$/);
    }
  );

  it("lets apps without dark mode support pin the light values", () => {
    expect(themeCSS.slice(darkStart)).toContain(
      ':root:not([data-color-scheme="light"])'
    );
  });

  describe.each(modes)("%s mode", (_mode, colors) => {
    const combinations = GROUNDS.flatMap((ground) =>
      TEXT_ON_GROUNDS.map((text) => [text, ground] as const)
    );

    it.each(combinations)(
      `%s on %s has a contrast ratio of at least ${MIN_CONTRAST_RATIO}:1`,
      (text, ground) => {
        expect(
          contrastRatio(
            resolveColor(colors, text),
            resolveColor(colors, ground)
          )
        ).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO);
      }
    );

    const tintedCombinations = GROUNDS.flatMap((ground) =>
      TINTED_COLORS.map((color) => [color, ground] as const)
    );

    it.each(tintedCombinations)(
      `%s on a tint of itself over %s has a contrast ratio of at least ${MIN_CONTRAST_RATIO}:1`,
      (color, ground) => {
        const foreground = resolveColor(colors, color);
        const background = blend(
          foreground,
          resolveColor(colors, ground),
          TINT_ALPHA
        );

        expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(
          MIN_CONTRAST_RATIO
        );
      }
    );

    const alertCombinations = GROUNDS.flatMap((ground) =>
      ALERT_TINTED_COLORS.map((color) => [color, ground] as const)
    );

    it.each(alertCombinations)(
      `--color-foreground on a tint of %s over %s has a contrast ratio of at least ${MIN_CONTRAST_RATIO}:1`,
      (color, ground) => {
        const background = blend(
          resolveColor(colors, color),
          resolveColor(colors, ground),
          TINT_ALPHA
        );

        expect(
          contrastRatio(resolveColor(colors, "--color-foreground"), background)
        ).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO);
      }
    );

    const focusRingCombinations = GROUNDS.flatMap((ground) =>
      FOCUS_RING_COLORS.map((color) => [color, ground] as const)
    );

    it.each(focusRingCombinations)(
      `focus ring in %s on %s has a contrast ratio of at least ${MIN_NON_TEXT_CONTRAST_RATIO}:1`,
      (color, ground) => {
        expect(
          contrastRatio(
            resolveColor(colors, color),
            resolveColor(colors, ground)
          )
        ).toBeGreaterThanOrEqual(MIN_NON_TEXT_CONTRAST_RATIO);
      }
    );

    it.each(FOREGROUND_PAIRS)(
      `%s on %s has a contrast ratio of at least ${MIN_CONTRAST_RATIO}:1`,
      (text, ground) => {
        expect(
          contrastRatio(
            resolveColor(colors, text),
            resolveColor(colors, ground)
          )
        ).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO);
      }
    );
  });
});
