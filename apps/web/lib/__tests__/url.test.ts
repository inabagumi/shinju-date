import type { ParsedUrlQuery } from 'node:querystring'
import { getQueryValue, parseQueries } from '../url'

const DUMMY_QUERY: ParsedUrlQuery = {
  a: 'test',
  b: ['test', 'test'],
}

describe('getQueryValue', () => {
  it('should returns a single string when given the key of a query with a single value.', () => {
    const result = getQueryValue('a', DUMMY_QUERY)

    expect(result).toBe('test')
  })

  it('should returns a single string separated by whitespace when given the key of a query with a multiple values.', () => {
    const result = getQueryValue('b', DUMMY_QUERY)

    expect(result).toBe('test test')
  })

  it('should returns a undefined when given key that does not exist in the query.', () => {
    const result = getQueryValue('c', DUMMY_QUERY)

    expect(result).toBeUndefined()
  })
})

describe('parseQueries', () => {
  it('should return empty string when queries is undefined', () => {
    const result = parseQueries(undefined)

    expect(result).toBe('')
  })

  it('should decode and join queries with slash', () => {
    const result = parseQueries(['hello', 'world'])

    expect(result).toBe('hello/world')
  })

  it('should decode URI components', () => {
    const result = parseQueries(['hello%20world', 'test'])

    expect(result).toBe('hello world/test')
  })
})
