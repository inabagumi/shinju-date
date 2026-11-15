import { TALENT_AFFILIATION_NAME } from '@shinju-date/constants'
import { describe, expect, test } from 'vitest'
import { getVideoTitleParts } from '../video-title'

describe('getVideoTitleParts', () => {
  test('should put the first label and up to three hashtags in the tags', () => {
    expect(
      getVideoTitleParts(
        '【Minecraft】【雑談】夜の肝試し #マイクラ肝試し2026 #a #b #c',
      ),
    ).toEqual({
      tags: 'Minecraft #マイクラ肝試し2026 #a #b',
      text: '夜の肝試し',
    })
  })

  test('should leave the tags empty without labels and hashtags', () => {
    expect(getVideoTitleParts('今日も歌います')).toEqual({
      tags: '',
      text: '今日も歌います',
    })
  })

  test('should drop the credits of the talent and the affiliation', () => {
    expect(
      getVideoTitleParts(
        `【歌枠】今日も歌います【朝霧ミオ / ${TALENT_AFFILIATION_NAME}】`,
        '朝霧ミオ',
      ),
    ).toEqual({ tags: '歌枠', text: '今日も歌います' })
  })

  test('should keep the name of a talent without the talent', () => {
    expect(getVideoTitleParts('【朝霧ミオ】今日も歌います', null)).toEqual({
      tags: '朝霧ミオ',
      text: '今日も歌います',
    })
  })
})
