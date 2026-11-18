/**
 * Removes duplicate IDs, keeping the order of first appearance.
 */
export function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
