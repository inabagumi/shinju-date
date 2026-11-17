import { describe, expect, it } from 'vitest'
import { parseQueries } from './url'

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
