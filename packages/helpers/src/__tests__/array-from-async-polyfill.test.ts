import { describe, expect, it } from 'vitest'
import '../array-from-async-polyfill.js'

describe('Array.fromAsync polyfill', () => {
  it('should be available as a function', () => {
    expect(typeof Array.fromAsync).toBe('function')
  })

  it('should convert async iterable to array', async () => {
    async function* asyncGenerator() {
      yield 1
      yield 2
      yield 3
    }

    const result = await Array.fromAsync(asyncGenerator())
    expect(result).toEqual([1, 2, 3])
  })

  it('should support mapper function', async () => {
    async function* asyncGenerator() {
      yield 1
      yield 2
      yield 3
    }

    const result = await Array.fromAsync(asyncGenerator(), (x) => x * 2)
    expect(result).toEqual([2, 4, 6])
  })

  it('should support async mapper function', async () => {
    async function* asyncGenerator() {
      yield 1
      yield 2
      yield 3
    }

    const result = await Array.fromAsync(
      asyncGenerator(),
      async (x) => {
        await new Promise((resolve) => setTimeout(resolve, 1))
        return x * 2
      }
    )
    expect(result).toEqual([2, 4, 6])
  })

  it('should work with regular iterables of promises', async () => {
    const promises = [
      Promise.resolve(1),
      Promise.resolve(2),
      Promise.resolve(3),
    ]

    const result = await Array.fromAsync(promises)
    expect(result).toEqual([1, 2, 3])
  })
})