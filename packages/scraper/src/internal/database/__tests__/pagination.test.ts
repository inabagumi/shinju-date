import { describe, expect, it, vi } from 'vitest'
import { paginateById } from '../pagination.js'

function rows(...ids: string[]) {
  return ids.map((id) => ({ id }))
}

describe('paginateById', () => {
  it('asks for the rows after the last ID of the previous page', async () => {
    const getPage = vi
      .fn()
      .mockResolvedValueOnce(rows('a', 'b'))
      .mockResolvedValueOnce(rows('c'))
      .mockResolvedValueOnce([])

    const pages = await Array.fromAsync(paginateById(getPage))

    expect(pages).toEqual([rows('a', 'b'), rows('c')])
    expect(getPage.mock.calls).toEqual([[undefined], ['b'], ['c']])
  })

  it('yields nothing for an empty table', async () => {
    const getPage = vi.fn().mockResolvedValue([])

    await expect(Array.fromAsync(paginateById(getPage))).resolves.toEqual([])
    expect(getPage).toHaveBeenCalledTimes(1)
  })

  it('fails instead of repeating a page that does not advance', async () => {
    // A backend that ignores the cursor returns the same page every time.
    const getPage = vi.fn().mockResolvedValue(rows('a', 'b'))

    await expect(Array.fromAsync(paginateById(getPage))).rejects.toThrow(
      'Pagination did not advance',
    )
    expect(getPage).toHaveBeenCalledTimes(2)
  })
})
