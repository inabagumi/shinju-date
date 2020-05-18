import getValue from '@/utils/getValue'

describe('getValue', () => {
  it('string is given', () => {
    const value = getValue('123')

    expect(value).toBe('123')
  })

  it('array is given', () => {
    const value = getValue(['abc', 'def'])

    expect(value).toBe('abc')
  })

  it('undefined is given', () => {
    const value = getValue(undefined)

    expect(value).toBe('')
  })
})
