import { describe, expect, test } from 'vitest'
import type { Talent } from '../fetchers'
import { findMatchingTalents } from '../talent-match'

const TALENTS: Talent[] = [
  { id: '00000000-0000-4000-8000-000000000001', name: '一ノ瀬うるは' },
  {
    id: '00000000-0000-4000-8000-000000000002',
    name: 'Ｌｉｓａ Ｈａｎａｂｕｓａ',
  },
  { id: '00000000-0000-4000-8000-000000000003', name: 'ｶﾀｶﾅ太郎' },
  { id: '00000000-0000-4000-8000-000000000004', name: 'うるる' },
]

describe('findMatchingTalents', () => {
  test('should return the talents whose name contains the query', () => {
    expect(findMatchingTalents(TALENTS, 'うる')).toEqual([
      TALENTS[0],
      TALENTS[3],
    ])
    expect(findMatchingTalents(TALENTS, '一ノ瀬')).toEqual([TALENTS[0]])
  })

  test('should ignore the difference between full-width and half-width characters', () => {
    expect(findMatchingTalents(TALENTS, 'lisa')).toEqual([TALENTS[1]])
    expect(findMatchingTalents(TALENTS, 'カタカナ')).toEqual([TALENTS[2]])
    expect(findMatchingTalents(TALENTS, 'ｶﾀｶﾅ')).toEqual([TALENTS[2]])
  })

  test('should ignore the difference between upper and lower case', () => {
    expect(findMatchingTalents(TALENTS, 'HANABUSA')).toEqual([TALENTS[1]])
    expect(findMatchingTalents(TALENTS, 'ｈａｎａ')).toEqual([TALENTS[1]])
  })

  test('should return nothing for an empty query', () => {
    expect(findMatchingTalents(TALENTS, '')).toEqual([])
    expect(findMatchingTalents(TALENTS, '　 ')).toEqual([])
  })

  test('should not return the excluded talents', () => {
    expect(
      findMatchingTalents(TALENTS, 'うる', [TALENTS[0]?.id ?? '']),
    ).toEqual([TALENTS[3]])
  })
})
