import { describe, expect, it } from 'vitest'
import { chunk, toBatches, unique } from '../batch.js'

describe('unique', () => {
  it('removes duplicates and keeps the first appearance', () => {
    expect(unique(['b', 'a', 'b', 'c', 'a'])).toEqual(['b', 'a', 'c'])
  })
})

describe('chunk', () => {
  it('splits values into chunks of the given size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('returns no chunks for an empty list', () => {
    expect(chunk([], 2)).toEqual([])
  })
})

describe('toBatches', () => {
  it('deduplicates before batching', () => {
    expect(toBatches(['a', 'b', 'a', 'c'], 2)).toEqual([['a', 'b'], ['c']])
  })
})
