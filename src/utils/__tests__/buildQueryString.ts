import buildQueryString from '@/utils/buildQueryString'

describe('buildQueryString', () => {
  it('number is given', () => {
    const queryString = buildQueryString({
      count: 10
    })

    expect(queryString).toBe('count=10')
  })

  it('multibyte character set is given', () => {
    const queryString = buildQueryString({
      q: '因幡はねる'
    })

    expect(queryString).toBe('q=%E5%9B%A0%E5%B9%A1%E3%81%AF%E3%81%AD%E3%82%8B')
  })

  it('date is given', () => {
    const queryString = buildQueryString({
      until: '2020-04-02T15:00:00.000Z'
    })

    expect(queryString).toBe('until=2020-04-02T15%3A00%3A00.000Z')
  })
})
