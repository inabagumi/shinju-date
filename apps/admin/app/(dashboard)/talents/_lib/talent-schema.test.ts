import { describe, expect, it } from 'vitest'
import { talentReadingSchema } from './talent-schema'

describe('talentReadingSchema', () => {
  it.each([
    ['しんじゅ', 'しんじゅ'],
    ['  しんじゅ　', 'しんじゅ'],
    ['らーめん', 'らーめん'],
    ['ゔぁいおれっと', 'ゔぁいおれっと'],
  ])('should accept %j as %j', (input, expected) => {
    expect(talentReadingSchema.parse(input)).toBe(expected)
  })

  it.each([[''], ['   '], [null], [undefined]])(
    'should treat %j as null',
    (input) => {
      expect(talentReadingSchema.parse(input)).toBeNull()
    },
  )

  it('should save the decomposed and precomposed voiced sounds as the same value', () => {
    const precomposed = 'がぱ'
    const decomposed = 'がぱ'

    expect(decomposed).not.toBe(precomposed)
    expect(talentReadingSchema.parse(decomposed)).toBe(precomposed)
    expect(talentReadingSchema.parse(precomposed)).toBe(precomposed)
  })

  it.each([
    ['シンジュ'],
    ['ｼﾝｼﾞｭ'],
    ['真珠'],
    ['shinju'],
    ['しん じゅ'],
    ['しんじゅ!'],
    ['ｰ'],
    ['か゛'],
  ])('should reject %j', (input) => {
    const result = talentReadingSchema.safeParse(input)

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe(
      '読み仮名はひらがなと長音符（ー）で入力してください。',
    )
  })
})
