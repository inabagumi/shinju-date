import { describe, expect, it } from 'vitest'
import { createEntityNameFromMessage } from './create-entity-name-from-message'

describe('createEntityNameFromMessage', () => {
  it('returns a message of up to 40 characters as it is', () => {
    const message = 'あ'.repeat(40)

    expect(createEntityNameFromMessage(message)).toBe(message)
  })

  it('returns the first 40 characters of a longer message', () => {
    expect(createEntityNameFromMessage(`${'あ'.repeat(40)}い`)).toBe(
      'あ'.repeat(40),
    )
  })

  it('puts a message of several lines on one line', () => {
    expect(
      createEntityNameFromMessage('  検索について\n\n- 絞り込み\t条件  '),
    ).toBe('検索について - 絞り込み 条件')
  })

  it('does not cut a surrogate pair in half', () => {
    const name = createEntityNameFromMessage(`${'a'.repeat(39)}😀😀`)

    expect(name).toBe(`${'a'.repeat(39)}😀`)
    expect(name.isWellFormed()).toBe(true)
  })
})
