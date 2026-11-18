/**
 * Returns a new array with the items of `items` in random order.
 *
 * Uses the Fisher–Yates shuffle, so every order is equally likely.
 * The input array is not modified.
 *
 * @param items - Items to shuffle
 * @param random - Returns a number in [0, 1). Defaults to `Math.random`
 */
export function shuffle<T>(
  items: readonly T[],
  random: () => number = Math.random
): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const current = result[i] as T;
    result[i] = result[j] as T;
    result[j] = current;
  }

  return result;
}
