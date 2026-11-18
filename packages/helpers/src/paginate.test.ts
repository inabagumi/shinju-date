import { describe, expect, it, vi } from 'vitest'
import { type Page, paginate } from './paginate.js'

function pages<T>(...list: Page<T>[]) {
  const fetchPage = vi.fn(async (cursor: string | undefined) => {
    const index = cursor === undefined ? 0 : Number(cursor)
    const page = list[index]

    if (!page) {
      throw new Error(`Unexpected cursor: ${cursor}`)
    }

    return page
  })

  return fetchPage
}

describe('paginate', () => {
  it('fetches only the first page when it has no next page', async () => {
    const fetchPage = pages({ items: [1, 2], next: null })

    await expect(Array.fromAsync(paginate(fetchPage))).resolves.toEqual([1, 2])
    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage).toHaveBeenCalledWith(undefined)
  })

  it('treats an undefined or empty position as the last page', async () => {
    for (const next of [undefined, '']) {
      const fetchPage = pages({ items: ['a'], next })

      await expect(Array.fromAsync(paginate(fetchPage))).resolves.toEqual(['a'])
      expect(fetchPage).toHaveBeenCalledTimes(1)
    }
  })

  it('follows the position of the next page until there is none', async () => {
    const fetchPage = pages(
      { items: [1, 2], next: '1' },
      { items: [], next: '2' },
      { items: [3], next: null },
    )

    await expect(Array.fromAsync(paginate(fetchPage))).resolves.toEqual([
      1, 2, 3,
    ])
    expect(fetchPage.mock.calls).toEqual([[undefined], ['1'], ['2']])
  })

  it('yields the earlier pages and then throws the error of a page', async () => {
    const error = new Error('page 2 failed')
    const fetchPage = vi
      .fn<(cursor: string | undefined) => Promise<Page<number>>>()
      .mockResolvedValueOnce({ items: [1, 2], next: 'p2' })
      .mockRejectedValueOnce(error)

    const seen: number[] = []

    await expect(async () => {
      for await (const item of paginate(fetchPage)) {
        seen.push(item)
      }
    }).rejects.toBe(error)
    expect(seen).toEqual([1, 2])
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('fetches no further pages once the caller stops', async () => {
    const fetchPage = pages(
      { items: [1, 2], next: '1' },
      { items: [3], next: null },
    )

    for await (const item of paginate(fetchPage)) {
      expect(item).toBe(1)
      break
    }

    expect(fetchPage).toHaveBeenCalledTimes(1)
  })
})
