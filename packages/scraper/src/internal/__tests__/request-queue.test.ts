import { describe, expect, it } from 'vitest'
import { RequestQueue } from '../request-queue.js'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('RequestQueue', () => {
  it('keeps results in input order', async () => {
    const queue = new RequestQueue(3)

    const results = await queue.map([30, 10, 20], async (ms) => {
      await delay(ms)

      return ms
    })

    expect(results).toEqual([30, 10, 20])
  })

  it('shares its limit across concurrent calls', async () => {
    const queue = new RequestQueue(2)
    let running = 0
    let peak = 0
    const task = async () => {
      running++
      peak = Math.max(peak, running)
      await delay(5)
      running--
    }

    await Promise.all([
      queue.map([1, 2, 3], task),
      queue.mapSettled([4, 5, 6], task),
    ])

    expect(peak).toBe(2)
  })

  it('rejects map with the first failure', async () => {
    const queue = new RequestQueue()

    await expect(
      queue.map([1, 2], async (value) => {
        if (value === 2) {
          throw new Error('boom')
        }

        return value
      }),
    ).rejects.toThrow('boom')
  })

  it('reports failures of mapSettled per item', async () => {
    const queue = new RequestQueue()
    const error = new Error('boom')

    const results = await queue.mapSettled([1, 2], async (value) => {
      if (value === 2) {
        throw error
      }

      return value
    })

    expect(results).toEqual([
      { status: 'fulfilled', value: 1 },
      { reason: error, status: 'rejected' },
    ])
  })
})
