/**
 * Helper function to generate an array of numbers, similar to Python's range() and ECMAScript's Iterator.range
 *
 * @param start - The start value (or stop if only one argument)
 * @param stop - The end value (exclusive)
 * @param step - The increment step (default: 1)
 * @returns An array of numbers
 *
 * @example
 * range(5) // [0, 1, 2, 3, 4]
 * range(2, 5) // [2, 3, 4]
 * range(0, 10, 2) // [0, 2, 4, 6, 8]
 * range(5, 0, -1) // [5, 4, 3, 2, 1]
 */
export function range(start: number, stop?: number, step = 1): number[] {
  // Single argument case: range(stop)
  if (stop === undefined) {
    stop = start
    start = 0
  }

  // Validate step
  if (step === 0) {
    throw new RangeError('Range step cannot be zero')
  }

  const length = Math.max(0, Math.ceil((stop - start) / step))
  return Array.from({ length }, (_, i) => start + i * step)
}
