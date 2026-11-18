import { describe, expect, it } from 'vitest'
import { unique } from './batch.js'

describe('unique', () => {
  it('removes duplicates and keeps the first appearance', () => {
    expect(unique(['b', 'a', 'b', 'c', 'a'])).toEqual(['b', 'a', 'c'])
  })
})
