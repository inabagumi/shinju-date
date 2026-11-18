import { describe, expect, test } from 'vitest'
import type { TalentTwitchUser, TalentYouTubeChannel } from '@/lib/data/talents'
import { createTalentDetail } from '@/test/factories'
import {
  findFirstNonBlank,
  getTalentCalendarPath,
  getTalentLinks,
  getTalentPath,
} from './talent-links'

const TALENT_ID = '00000000-0000-4000-8000-000000000001'

function createYouTubeChannel(
  overrides: Partial<TalentYouTubeChannel> = {},
): TalentYouTubeChannel {
  return {
    name: 'メインチャンネル',
    profile_image: null,
    youtube_channel_id: 'UCmain',
    youtube_handle: '@main',
    ...overrides,
  }
}

function createTwitchUser(
  overrides: Partial<TalentTwitchUser> = {},
): TalentTwitchUser {
  return {
    name: 'Twitch表示名',
    profile_image: null,
    twitch_login_name: 'login',
    twitch_user_id: '100',
    ...overrides,
  }
}

describe('findFirstNonBlank', () => {
  test('should return the first value that is not blank, trimmed', () => {
    expect(findFirstNonBlank(null, undefined, ' ', ' name ', 'other')).toBe(
      'name',
    )
  })

  test('should return null without any value that is not blank', () => {
    expect(findFirstNonBlank()).toBeNull()
    expect(findFirstNonBlank(null, undefined, '', '  ')).toBeNull()
  })
})

describe('getTalentLinks', () => {
  test('should link to each channel and the calendar', () => {
    expect(
      getTalentLinks(
        createTalentDetail({
          twitch_users: [createTwitchUser()],
          youtube_channels: [createYouTubeChannel()],
        }),
      ),
    ).toEqual([
      {
        external: true,
        href: 'https://www.youtube.com/channel/UCmain',
        label: 'YouTube チャンネル',
      },
      {
        external: true,
        href: 'https://www.twitch.tv/login',
        label: 'Twitch チャンネル',
      },
      {
        external: false,
        href: `/talents/${TALENT_ID}.ics`,
        label: 'カレンダーに登録',
      },
    ])
  })

  test('should tell several accounts of the same platform apart', () => {
    const links = getTalentLinks(
      createTalentDetail({
        twitch_users: [
          createTwitchUser(),
          createTwitchUser({
            name: null,
            twitch_login_name: 'sub_login',
            twitch_user_id: '200',
          }),
        ],
        youtube_channels: [
          createYouTubeChannel(),
          createYouTubeChannel({
            name: ' ',
            youtube_channel_id: 'UCsub',
            youtube_handle: '@sub',
          }),
          createYouTubeChannel({
            name: null,
            youtube_channel_id: 'UCthird',
            youtube_handle: null,
          }),
        ],
      }),
    )

    expect(links.map((link) => link.label)).toEqual([
      'YouTube チャンネル（メインチャンネル）',
      'YouTube チャンネル（@sub）',
      'YouTube チャンネル（UCthird）',
      'Twitch チャンネル（Twitch表示名）',
      'Twitch チャンネル（sub_login）',
      'カレンダーに登録',
    ])
  })

  test('should skip Twitch users without a login', () => {
    const links = getTalentLinks(
      createTalentDetail({
        twitch_users: [
          createTwitchUser({ twitch_login_name: null }),
          createTwitchUser({ twitch_login_name: 'login2' }),
        ],
      }),
    )

    expect(links).toEqual([
      {
        external: true,
        href: 'https://www.twitch.tv/login2',
        label: 'Twitch チャンネル',
      },
      {
        external: false,
        href: `/talents/${TALENT_ID}.ics`,
        label: 'カレンダーに登録',
      },
    ])
  })
})

describe('getTalentPath', () => {
  test('should add the kind of videos except for all', () => {
    expect(getTalentPath(TALENT_ID, 'all')).toBe(`/talents/${TALENT_ID}`)
    expect(getTalentPath(TALENT_ID, 'short')).toBe(
      `/talents/${TALENT_ID}?kind=short`,
    )
    expect(getTalentPath(TALENT_ID, 'standard')).toBe(
      `/talents/${TALENT_ID}?kind=standard`,
    )
  })

  test('should return the paths of the page and the calendar', () => {
    expect(getTalentPath(TALENT_ID)).toBe(`/talents/${TALENT_ID}`)
    expect(getTalentCalendarPath(TALENT_ID)).toBe(`/talents/${TALENT_ID}.ics`)
  })
})
