export async function fromAsync<T, TReturn = any>(
  iterator: AsyncGenerator<T, TReturn, undefined>
): Promise<T[]> {
  const values: T[] = []

  for await (const value of iterator) {
    values.push(value)
  }

  return values
}
