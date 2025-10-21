/**
 * Helper function to generate an array of numbers, similar to Python's range()
 * @param length - The length of the array to generate
 * @returns An array of numbers from 0 to length-1
 */
export function range(length: number): number[] {
  return Array.from({ length }, (_, i) => i)
}
