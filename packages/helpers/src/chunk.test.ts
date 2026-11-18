import { describe, expect, it } from 'vitest'
import { chunk } from './chunk.js'

describe('chunk', () => {
  it('returns no chunks for an empty array', () => {
    expect(chunk([], 3)).toEqual([])
  })

  it('returns one chunk when the items fill it exactly', () => {
    expect(chunk([1, 2, 3], 3)).toEqual([[1, 2, 3]])
  })

  it('returns one chunk when the items are fewer than the size', () => {
    expect(chunk([1, 2], 3)).toEqual([[1, 2]])
  })

  it('puts what is left over into the last chunk', () => {
    expect(chunk([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]])
  })

  it('splits into full chunks when the length is a multiple of the size', () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ])
  })

  it('does not change the items', () => {
    const items = [1, 2, 3] as const

    chunk(items, 2)

    expect(items).toEqual([1, 2, 3])
  })

  it.each([0, -1, 1.5, Number.NaN])('throws for a size of %s', (size) => {
    expect(() => chunk([1, 2, 3], size)).toThrow(RangeError)
  })
})
