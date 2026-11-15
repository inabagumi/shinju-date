/** `#RRGGBB`, the form the admin app stores in `talents.theme_color` */
const THEME_COLOR_PATTERN = /^#[0-9a-f]{6}$/i

/**
 * The theme color of a talent, or `null` when it is not set or is not
 * `#RRGGBB`. The value is put into a `style` attribute, so anything else is
 * dropped instead of being passed through.
 */
export function parseThemeColor(
  value: string | null | undefined,
): string | null {
  if (!value || !THEME_COLOR_PATTERN.test(value)) {
    return null
  }

  return value.toLowerCase()
}
