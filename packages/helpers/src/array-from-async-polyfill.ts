/**
 * Polyfill for Array.fromAsync() method
 * This is a temporary solution for Node.js versions below v22 which don't support Array.fromAsync()
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/fromAsync
 */

// Check if Array.fromAsync is available (Node.js v22+)
if (typeof Array.fromAsync === 'undefined') {
  // Polyfill implementation
  Array.fromAsync = async function fromAsync<T, U = T>(
    arrayLike: AsyncIterable<T> | Iterable<T | Promise<T>>,
    mapFn?: (value: T, index: number) => U | Promise<U>,
    thisArg?: unknown,
  ): Promise<U[]> {
    const result: U[] = []
    let index = 0

    // Handle async iterables
    if (Symbol.asyncIterator in arrayLike) {
      for await (const item of arrayLike as AsyncIterable<T>) {
        const mappedValue = mapFn
          ? await mapFn.call(thisArg, item, index++)
          : (item as unknown as U)
        result.push(mappedValue)
      }
      return result
    }

    // Handle regular iterables
    if (Symbol.iterator in arrayLike) {
      for (const item of arrayLike as Iterable<T | Promise<T>>) {
        const resolvedItem = await Promise.resolve(item)
        const mappedValue = mapFn
          ? await mapFn.call(thisArg, resolvedItem, index++)
          : (resolvedItem as unknown as U)
        result.push(mappedValue)
      }
      return result
    }

    throw new TypeError(
      'Array.fromAsync requires an iterable or async iterable',
    )
  }
}

// Export the function for explicit import if needed
export const fromAsync = Array.fromAsync

// Type augmentation for Array.fromAsync polyfill
declare global {
  interface ArrayConstructor {
    fromAsync<T, U = T>(
      arrayLike: AsyncIterable<T> | Iterable<T | Promise<T>>,
      mapFn?: (value: T, index: number) => U | Promise<U>,
      thisArg?: unknown,
    ): Promise<U[]>
  }
}
