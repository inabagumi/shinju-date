/**
 * Validation utilities for form inputs
 */

/**
 * Validates if a string is a valid hex color code in #RRGGBB format
 * @param color - The color string to validate
 * @returns true if valid, false otherwise
 */
export function isValidHexColor(color: string): boolean {
  const hexColorPattern = /^#[0-9A-Fa-f]{6}$/
  return hexColorPattern.test(color)
}

/**
 * Color validation error message
 */
export const COLOR_VALIDATION_ERROR_MESSAGE =
  'カラーコードは#RRGGBB形式で入力してください（例: #FF5733）'
