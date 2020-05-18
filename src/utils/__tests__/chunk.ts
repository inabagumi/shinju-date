import chunk from '@/utils/chunk'

describe('chunk', () => {
  it('basic', () => {
    const result = chunk([1, 2, 3, 4, 5, 6, 7])

    expect(result).toEqual([[1], [2], [3], [4], [5], [6], [7]])
  })

  it('size is given', () => {
    const result = chunk([1, 2, 3, 4, 5, 6, 7], 3)

    expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7]])
  })
})
