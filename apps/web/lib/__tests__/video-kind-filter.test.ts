import { describe, expect, test } from 'vitest'
import {
  getVideoKinds,
  getVideosPath,
  parseVideoKindFilter,
} from '../video-kind-filter'

describe('parseVideoKindFilter', () => {
  test('should return the given kind', () => {
    expect(parseVideoKindFilter('short')).toBe('short')
    expect(parseVideoKindFilter('standard')).toBe('standard')
    expect(parseVideoKindFilter(['short', 'standard'])).toBe('short')
  })

  test('should treat missing and unknown values as all', () => {
    expect(parseVideoKindFilter(undefined)).toBe('all')
    expect(parseVideoKindFilter('')).toBe('all')
    expect(parseVideoKindFilter('live')).toBe('all')
  })
})

describe('getVideoKinds', () => {
  test('should not filter for all', () => {
    expect(getVideoKinds('all')).toBeUndefined()
  })

  test('should filter by the given kind', () => {
    expect(getVideoKinds('short')).toEqual(['short'])
    expect(getVideoKinds('standard')).toEqual(['standard'])
  })
})

describe('getVideosPath', () => {
  test('should link to the videos page', () => {
    expect(getVideosPath('', 'all')).toBe('/videos')
    expect(getVideosPath('', 'short')).toBe('/videos?kind=short')
  })

  test('should link to the search results', () => {
    expect(getVideosPath('歌', 'all')).toBe(
      `/videos/${encodeURIComponent('歌')}`,
    )
    expect(getVideosPath('歌 枠', 'standard')).toBe(
      `/videos/${encodeURIComponent('歌 枠')}?kind=standard`,
    )
  })
})
