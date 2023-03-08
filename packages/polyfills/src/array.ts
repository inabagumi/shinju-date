async function polyfillFromAsync<T, TReturn = unknown>(
  iterator: AsyncGenerator<T, TReturn, undefined>
): Promise<T[]> {
  const values: T[] = []

  for await (const value of iterator) {
    values.push(value)
  }

  return values
}

declare global {
  interface ArrayConstructor {
    fromAsync: typeof polyfillFromAsync
  }
}

if (!('fromAsync' in Array)) {
  Object.defineProperty(Array, 'fromAsync', {
    configurable: false,
    enumerable: false,
    value: polyfillFromAsync,
    writable: false
  })
}
