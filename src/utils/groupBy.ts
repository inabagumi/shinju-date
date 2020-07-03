function groupBy<V>(
  values: V[],
  iteratee: (value: V, index: number) => string
): Record<string, V[]> {
  return values.reduce<Record<string, V[]>>((map, value, index) => {
    const key = iteratee(value, index)
    const items = map[key] ?? []

    return {
      ...map,
      [key]: items.concat(value)
    }
  }, {})
}

export default groupBy
