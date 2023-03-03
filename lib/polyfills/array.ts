declare global {
  interface ArrayConstructor {
    fromAsync<T, TReturn = any>(
      iterator: AsyncGenerator<T, TReturn, undefined>
    ): Promise<T[]>
  }
}

async function polyfillFromAsync<T, TReturn = any>(
  iterator: AsyncGenerator<T, TReturn, undefined>
): Promise<T[]> {
  const values: T[] = []

  for await (const value of iterator) {
    values.push(value)
  }

  return values
}

export const fromAsync =
  'fromAsync' in Array ? Array.fromAsync.bind(this) : polyfillFromAsync
