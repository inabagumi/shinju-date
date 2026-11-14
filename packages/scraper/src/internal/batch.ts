/**
 * Removes duplicate IDs, keeping the order of first appearance.
 */
export function unique(values: readonly string[]): string[] {
  return [...new Set(values)]
}

/**
 * Splits `values` into consecutive chunks of at most `size` items.
 */
export function chunk<T>(values: readonly T[], size: number): T[][] {
  const chunks: T[][] = []

  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size))
  }

  return chunks
}

/**
 * Deduplicates IDs and splits them into the batches one API request accepts.
 */
export function toBatches(ids: readonly string[], size: number): string[][] {
  return chunk(unique(ids), size)
}
