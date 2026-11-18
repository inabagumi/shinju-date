/**
 * Splits `items` into consecutive chunks of at most `size` items, keeping
 * their order. The last chunk holds what is left over.
 *
 * @param items - The items to split.
 * @param size - The most items a chunk holds; a positive integer.
 * @returns The chunks, or an empty array when `items` is empty.
 * @throws {RangeError} When `size` is not a positive integer.
 *
 * @example
 * chunk([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
 */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError('Chunk size must be a positive integer')
  }

  const chunks: T[][] = []

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }

  return chunks
}
