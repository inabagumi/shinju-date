function chunk<T = unknown>(array: Array<T>, size = 2): Array<Array<T>> {
  const result: Array<Array<T>> = []

  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size))
  }

  return result
}

export default chunk
