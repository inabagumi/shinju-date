/**
 * Removes duplicate IDs, keeping the order of first appearance.
 */
export const unique = (values: readonly string[]): string[] => [
  ...new Set(values),
];
