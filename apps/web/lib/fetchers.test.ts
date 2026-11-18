// @vitest-environment node
import { logger } from '@shinju-date/logger'
import { cacheLife, cacheTag } from 'next/cache'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  createAnnouncement,
  createProfileImage,
  createTalent,
  createThumbnail,
  createTwitchUser,
  createVideo,
  createVideoOnTwitch,
  createVideoOnYouTube,
  createYouTubeChannel,
} from '@/test/factories'
import {
  failSupabase,
  seedSupabase,
  setupSupabase,
  supabaseRequests,
  videoSeed,
} from '@/test/supabase'
import {
  countVideos,
  fetchActiveAnnouncements,
  fetchActiveTalents,
  fetchCalendarVideos,
  fetchCurrentTime,
  fetchDashboardVideos,
  fetchOldestVideoDate,
  fetchScheduleToday,
  fetchScheduleVideos,
  fetchTalent,
  fetchTalentList,
  fetchTalentStreamStarts,
  fetchTalentStreamStatuses,
  fetchTalentStreamStatusesSafe,
  fetchUpcomingVideos,
  fetchVideos,
} from './fetchers'

vi.mock('@shinju-date/logger', () => ({
  logger: { error: vi.fn() },
}))

// Vitest does not run `'use cache'`, so only what the fetchers pass to the
// cache is checked
vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

setupSupabase()

/** Fix the current time, which the fetchers read in both ways */
function mockNow(value: string): void {
  const now = Temporal.Instant.from(value)

  vi.spyOn(Temporal.Now, 'instant').mockReturnValue(now)
  vi.spyOn(Temporal.Now, 'zonedDateTimeISO').mockImplementation((timeZone) =>
    now.toZonedDateTimeISO(timeZone ?? 'UTC'),
  )
}

/** The IDs of the given rows or results, to compare them in order */
function ids(rows: readonly { id: string }[]): string[] {
  return rows.map((row) => row.id)
}

const talent = createTalent({ name: '朝霧ミオ' })
const otherTalent = createTalent({ name: '風花リツ' })
const channel = createYouTubeChannel({ talent_id: talent.id })
const otherChannel = createYouTubeChannel({ talent_id: otherTalent.id })
const twitchUser = createTwitchUser({
  talent_id: otherTalent.id,
  twitch_login_name: 'ritsu',
})

/** Put the talents, their accounts and the given videos in the database */
function seedVideos(
  rows: Parameters<typeof videoSeed>[0],
): ReturnType<typeof seedSupabase> {
  return seedSupabase({
    talents: [talent, otherTalent],
    twitchUsers: [twitchUser],
    youtubeChannels: [channel, otherChannel],
    ...videoSeed(rows),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fetchVideos', () => {
  beforeEach(() => {
    mockNow('2026-11-15T03:20:00Z')
  })

  test('searches the videos of all talents by default', async () => {
    const song = createVideoOnYouTube(channel, { title: '歌枠' })
    const otherSong = createVideoOnYouTube(otherChannel, {
      published_at: '2026-11-14T12:00:00Z',
      title: '歌ってみた',
    })
    const chat = createVideoOnYouTube(channel, { title: '雑談' })

    await seedVideos([song, otherSong, chat])

    expect(ids(await fetchVideos({ query: '歌' }))).toEqual([
      song.video.id,
      otherSong.video.id,
    ])
  })

  test('searches only the videos of the given talents and kind', async () => {
    const short = createVideoOnYouTube(channel, { video_kind: 'short' })
    const standard = createVideoOnYouTube(channel)
    const otherShort = createVideoOnYouTube(otherChannel, {
      video_kind: 'short',
    })

    await seedVideos([short, standard, otherShort])

    expect(
      ids(await fetchVideos({ kind: 'short', talentIds: [talent.id] })),
    ).toEqual([short.video.id])
  })

  test('returns the videos before `until`, newest first', async () => {
    const older = createVideoOnYouTube(channel, {
      published_at: '2026-11-10T12:00:00Z',
    })
    const newer = createVideoOnYouTube(channel, {
      published_at: '2026-11-12T12:00:00Z',
    })
    const later = createVideoOnYouTube(channel, {
      published_at: '2026-11-14T12:00:00Z',
    })

    await seedVideos([older, later, newer])

    const until = Temporal.Instant.from(later.video.published_at)

    expect(ids(await fetchVideos({ until: until.epochNanoseconds }))).toEqual([
      newer.video.id,
      older.video.id,
    ])
  })

  test('leaves out the videos without a YouTube or Twitch video', async () => {
    const shown = createVideoOnYouTube(channel)
    const hidden = createVideo({ talent_id: talent.id })

    await seedVideos([shown, hidden])

    expect(ids(await fetchVideos({}))).toEqual([shown.video.id])
  })

  test('throws when the videos cannot be searched', async () => {
    failSupabase('rpc/search_videos_v3', 'failed')

    await expect(fetchVideos({})).rejects.toThrow('failed')
  })
})

describe('countVideos', () => {
  beforeEach(() => {
    mockNow('2026-11-15T03:20:00Z')
  })

  test('counts the videos of all talents by default', async () => {
    await seedVideos([
      createVideoOnYouTube(channel),
      createVideoOnYouTube(channel),
      createVideoOnYouTube(otherChannel),
    ])

    await expect(countVideos({})).resolves.toBe(3)
  })

  test('counts only the videos of the given talents', async () => {
    await seedVideos([
      createVideoOnYouTube(channel, { title: '歌枠' }),
      createVideoOnYouTube(channel, { title: '雑談' }),
      createVideoOnYouTube(otherChannel, { title: '歌枠' }),
    ])

    await expect(
      countVideos({ query: '歌', talentIds: [talent.id] }),
    ).resolves.toBe(1)
  })

  test('throws when the videos cannot be counted', async () => {
    failSupabase('rpc/count_videos_v1', 'failed')

    await expect(countVideos({})).rejects.toThrow('failed')
  })
})

describe('fetchCalendarVideos', () => {
  beforeEach(() => {
    mockNow('2026-11-15T03:20:45.5Z')
  })

  test('returns the videos until the start of the hour a week later, latest first', async () => {
    const past = createVideoOnYouTube(channel, {
      published_at: '2026-11-10T12:00:00Z',
    })
    const upcoming = createVideoOnYouTube(channel, {
      published_at: '2026-11-22T02:59:59Z',
      status: 'UPCOMING',
    })
    const tooLate = createVideoOnYouTube(channel, {
      published_at: '2026-11-22T03:00:00Z',
      status: 'UPCOMING',
    })

    await seedVideos([past, tooLate, upcoming])

    const videos = await fetchCalendarVideos()

    expect(ids(videos)).toEqual([upcoming.video.id, past.video.id])
    expect(videos[1]).toEqual({
      duration: 'PT1H',
      id: past.video.id,
      platform: 'youtube',
      published_at: '2026-11-10T12:00:00Z',
      status: 'ENDED',
      talent: { id: talent.id, name: '朝霧ミオ' },
      title: '歌枠',
      twitch_video: null,
      video_kind: 'standard',
      youtube_video: { youtube_video_id: past.youtubeVideo.youtube_video_id },
    })
    expect(cacheLife).toHaveBeenCalledWith('hours')
    expect(cacheTag).toHaveBeenCalledWith('videos')
  })

  test('keeps the latest 100 videos', async () => {
    const rows = Array.from({ length: 101 }, (_, index) =>
      createVideoOnYouTube(channel, {
        published_at: Temporal.Instant.from('2026-11-01T00:00:00Z')
          .add({ minutes: index })
          .toString(),
      }),
    )

    await seedVideos(rows)

    const videos = await fetchCalendarVideos()

    expect(videos).toHaveLength(100)
    expect(ids(videos)).not.toContain(rows[0]?.video.id)
  })

  test('narrows the videos by the talents and the kind', async () => {
    const short = createVideoOnYouTube(channel, { video_kind: 'short' })
    const standard = createVideoOnYouTube(channel)
    const otherShort = createVideoOnYouTube(otherChannel, {
      video_kind: 'short',
    })

    await seedVideos([short, standard, otherShort])

    expect(
      ids(await fetchCalendarVideos({ kind: 'short', talentIds: [talent.id] })),
    ).toEqual([short.video.id])
    expect(
      ids(
        await fetchCalendarVideos({
          talentIds: [otherTalent.id, talent.id],
        }),
      ).toSorted(),
    ).toEqual(
      [short.video.id, standard.video.id, otherShort.video.id].toSorted(),
    )
  })

  test('leaves out the videos without a platform source', async () => {
    const shown = createVideoOnYouTube(channel)

    await seedVideos([shown, createVideo({ talent_id: talent.id })])

    expect(ids(await fetchCalendarVideos())).toEqual([shown.video.id])
  })

  test('throws when the videos cannot be fetched', async () => {
    failSupabase('videos', 'failed')

    await expect(fetchCalendarVideos()).rejects.toThrow('failed')
  })
})

describe('fetchActiveAnnouncements', () => {
  beforeEach(() => {
    mockNow('2026-11-17T03:00:00Z')
  })

  test('returns the enabled announcements that have not ended, newest first', async () => {
    const older = createAnnouncement({
      created_at: '2026-11-01T00:00:00Z',
      end_at: '2026-11-20T00:00:00Z',
      start_at: '2026-11-10T00:00:00Z',
    })
    const newer = createAnnouncement({
      created_at: '2026-11-05T00:00:00Z',
      end_at: '2026-11-17T03:00:01Z',
      start_at: '2026-11-10T00:00:00Z',
    })
    // Not started yet, which the caller decides when to show
    const future = createAnnouncement({
      created_at: '2026-11-03T00:00:00Z',
      end_at: '2026-11-25T00:00:00Z',
      start_at: '2026-11-18T00:00:00Z',
    })

    await seedSupabase({
      announcements: [
        older,
        createAnnouncement({ enabled: false }),
        createAnnouncement({ end_at: '2026-11-17T03:00:00Z' }),
        newer,
        future,
      ],
    })

    await expect(fetchActiveAnnouncements()).resolves.toEqual(
      [newer, future, older].map(
        ({ end_at, id, level, message, start_at }) => ({
          end_at,
          id,
          level,
          message,
          start_at,
        }),
      ),
    )
    expect(cacheLife).toHaveBeenCalledWith('minutes')
    expect(cacheTag).toHaveBeenCalledWith('announcements')
  })

  test('returns up to 10 announcements', async () => {
    const announcements = Array.from({ length: 11 }, (_, index) =>
      createAnnouncement({
        created_at: `2026-11-${String(index + 1).padStart(2, '0')}T00:00:00Z`,
      }),
    )

    await seedSupabase({ announcements })

    const fetched = await fetchActiveAnnouncements()

    expect(fetched).toHaveLength(10)
    expect(ids(fetched)).not.toContain(announcements[0]?.id)
  })

  test('throws when the announcements cannot be fetched', async () => {
    failSupabase('announcements', 'failed')

    await expect(fetchActiveAnnouncements()).rejects.toThrow('failed')
  })
})

describe('fetchActiveTalents', () => {
  test('returns the active talents that are not deleted, by name', async () => {
    const yuki = createTalent({ name: 'ゆき' })
    const aoi = createTalent({ name: 'あおい' })

    await seedSupabase({
      talents: [
        yuki,
        createTalent({ name: 'いずみ', status: 'retired' }),
        createTalent({ deleted_at: '2026-11-01T00:00:00Z', name: 'うみ' }),
        aoi,
      ],
    })

    await expect(fetchActiveTalents()).resolves.toEqual([
      { id: aoi.id, name: 'あおい' },
      { id: yuki.id, name: 'ゆき' },
    ])
    expect(cacheTag).toHaveBeenCalledWith('talents')
  })

  test('throws when the talents cannot be fetched', async () => {
    failSupabase('talents', 'failed')

    await expect(fetchActiveTalents()).rejects.toThrow('failed')
  })
})

describe('fetchTalent', () => {
  test('returns the talent with its accounts, sorted by their platform IDs', async () => {
    const icon = createProfileImage()
    const subChannel = createYouTubeChannel({
      name: 'Sub',
      talent_id: talent.id,
      youtube_channel_id: 'UCb',
    })
    const mainChannel = createYouTubeChannel({
      name: 'Main',
      profile_image_id: icon.id,
      talent_id: talent.id,
      youtube_channel_id: 'UCa',
      youtube_handle: '@main',
    })
    const userB = createTwitchUser({
      name: 'B',
      talent_id: talent.id,
      twitch_login_name: 'b',
      twitch_user_id: '200',
    })
    const userA = createTwitchUser({
      name: 'A',
      talent_id: talent.id,
      twitch_login_name: 'a',
      twitch_user_id: '100',
    })

    await seedSupabase({
      profileImages: [icon],
      talents: [{ ...talent, theme_color: '#FF6B9D' }, otherTalent],
      twitchUsers: [userB, userA, twitchUser],
      youtubeChannels: [subChannel, mainChannel, otherChannel],
    })

    await expect(fetchTalent(talent.id)).resolves.toEqual({
      id: talent.id,
      name: '朝霧ミオ',
      theme_color: '#FF6B9D',
      twitch_users: [
        {
          name: 'A',
          profile_image: null,
          twitch_login_name: 'a',
          twitch_user_id: '100',
        },
        {
          name: 'B',
          profile_image: null,
          twitch_login_name: 'b',
          twitch_user_id: '200',
        },
      ],
      youtube_channels: [
        {
          name: 'Main',
          profile_image: { blur_data_url: icon.blur_data_url, id: icon.id },
          youtube_channel_id: 'UCa',
          youtube_handle: '@main',
        },
        {
          name: 'Sub',
          profile_image: null,
          youtube_channel_id: 'UCb',
          youtube_handle: null,
        },
      ],
    })
  })

  test('is cached for days with the talents tag', async () => {
    await fetchTalent(talent.id)

    expect(cacheLife).toHaveBeenCalledWith('days')
    expect(cacheTag).toHaveBeenCalledWith('talents')
  })

  test.each([
    ['retired', { status: 'retired' }],
    ['deleted', { deleted_at: '2026-11-01T00:00:00Z' }],
  ] as const)('returns null for a talent that is %s', async (_, overrides) => {
    await seedSupabase({ talents: [{ ...talent, ...overrides }] })

    await expect(fetchTalent(talent.id)).resolves.toBeNull()
  })

  test('returns null for a talent that does not exist', async () => {
    await seedSupabase({ talents: [otherTalent] })

    await expect(fetchTalent(talent.id)).resolves.toBeNull()
  })

  test('returns null for an ID that is not a UUID without querying', async () => {
    await expect(fetchTalent('not-a-uuid')).resolves.toBeNull()
    expect(supabaseRequests()).toEqual([])
  })

  test('throws when the talent cannot be fetched', async () => {
    failSupabase('talents', 'connection refused')

    await expect(fetchTalent(talent.id)).rejects.toThrow('connection refused')
  })
})

describe('fetchTalentList', () => {
  test('returns the active talents by reading, and the ones without one by name last', async () => {
    const ka = createTalent({ name: 'B', reading: 'か' })
    const a = createTalent({ name: 'A', reading: 'あ' })
    const z = createTalent({ name: 'Z', reading: null })
    const y = createTalent({ name: 'Y', reading: null })

    await seedSupabase({
      talents: [
        z,
        ka,
        createTalent({ name: 'R', reading: 'い', status: 'retired' }),
        createTalent({ deleted_at: '2026-11-01T00:00:00Z', name: 'D' }),
        y,
        a,
      ],
    })

    const talents = await fetchTalentList()

    expect(talents.map((item) => item.name)).toEqual(['A', 'B', 'Y', 'Z'])
    expect(talents[0]).toEqual({
      id: a.id,
      name: 'A',
      twitch_users: [],
      youtube_channels: [],
    })
  })

  test('returns only the icons, in the same order as fetchTalent', async () => {
    const youtubeIcon = createProfileImage()
    const twitchIconA = createProfileImage()
    const twitchIconB = createProfileImage()

    await seedSupabase({
      profileImages: [youtubeIcon, twitchIconA, twitchIconB],
      talents: [talent],
      twitchUsers: [
        createTwitchUser({
          profile_image_id: twitchIconB.id,
          talent_id: talent.id,
          twitch_user_id: '200',
        }),
        createTwitchUser({
          profile_image_id: twitchIconA.id,
          talent_id: talent.id,
          twitch_user_id: '100',
        }),
      ],
      youtubeChannels: [
        createYouTubeChannel({
          profile_image_id: youtubeIcon.id,
          talent_id: talent.id,
          youtube_channel_id: 'UCb',
        }),
        createYouTubeChannel({
          talent_id: talent.id,
          youtube_channel_id: 'UCa',
        }),
      ],
    })

    const icon = ({
      blur_data_url,
      id,
    }: {
      blur_data_url: string
      id: string
    }) => ({ profile_image: { blur_data_url, id } })

    await expect(fetchTalentList()).resolves.toEqual([
      {
        id: talent.id,
        name: '朝霧ミオ',
        twitch_users: [icon(twitchIconA), icon(twitchIconB)],
        youtube_channels: [{ profile_image: null }, icon(youtubeIcon)],
      },
    ])
  })

  test('is cached for days with the talents tag', async () => {
    await fetchTalentList()

    expect(cacheLife).toHaveBeenCalledWith('days')
    expect(cacheTag).toHaveBeenCalledWith('talents')
  })

  test('throws when the talents cannot be fetched', async () => {
    failSupabase('talents', 'failed')

    await expect(fetchTalentList()).rejects.toThrow('failed')
  })
})

describe('fetchTalentStreamStatuses', () => {
  beforeEach(() => {
    // 03:34:56 in UTC, so this hour starts at 03:00
    mockNow('2026-11-15T03:34:56Z')
  })

  test('returns the earliest upcoming stream of each talent within a week', async () => {
    await seedVideos([
      createVideoOnYouTube(channel, {
        published_at: '2026-11-16T11:00:00Z',
        status: 'UPCOMING',
      }),
      createVideoOnYouTube(channel, {
        published_at: '2026-11-15T10:00:00Z',
        status: 'UPCOMING',
      }),
      createVideoOnYouTube(channel, {
        published_at: '2026-11-15T04:00:00Z',
        status: 'ENDED',
      }),
      createVideoOnTwitch(twitchUser, {
        published_at: '2026-11-15T12:00:00Z',
        status: 'UPCOMING',
      }),
      // A week from the start of the hour, like the upcoming videos of the
      // home page
      createVideoOnTwitch(twitchUser, {
        published_at: '2026-11-22T03:00:01Z',
        status: 'UPCOMING',
      }),
    ])

    await expect(fetchTalentStreamStatuses()).resolves.toEqual({
      [otherTalent.id]: {
        isLive: false,
        nextStreamAt: '2026-11-15T12:00:00Z',
      },
      [talent.id]: { isLive: false, nextStreamAt: '2026-11-15T10:00:00Z' },
    })
  })

  test('returns no talent without a stream within a week', async () => {
    await seedVideos([
      createVideoOnYouTube(channel, {
        published_at: '2026-11-22T03:00:01Z',
        status: 'UPCOMING',
      }),
    ])

    await expect(fetchTalentStreamStatuses()).resolves.toEqual({})
  })

  test('is cached for minutes with the videos tag', async () => {
    await fetchTalentStreamStatuses()

    expect(cacheLife).toHaveBeenCalledWith('minutes')
    expect(cacheTag).toHaveBeenCalledWith('videos')
    expect(cacheTag).not.toHaveBeenCalledWith('talents')
  })

  test('returns no next stream for a talent that is live', async () => {
    await seedVideos([
      createVideoOnYouTube(channel, {
        published_at: '2026-11-15T01:00:00Z',
        status: 'LIVE',
      }),
      createVideoOnYouTube(channel, {
        published_at: '2026-11-15T10:00:00Z',
        status: 'UPCOMING',
      }),
    ])

    await expect(fetchTalentStreamStatuses()).resolves.toEqual({
      [talent.id]: { isLive: true, nextStreamAt: null },
    })
  })

  test('skips the videos without YouTube or Twitch videos', async () => {
    await seedVideos([
      createVideo({ status: 'LIVE', talent_id: talent.id }),
      createVideo({
        published_at: '2026-11-15T10:00:00Z',
        status: 'UPCOMING',
        talent_id: otherTalent.id,
      }),
      createVideoOnYouTube(channel, {
        published_at: '2026-11-17T11:00:00Z',
        status: 'UPCOMING',
      }),
    ])

    await expect(fetchTalentStreamStatuses()).resolves.toEqual({
      [talent.id]: { isLive: false, nextStreamAt: '2026-11-17T11:00:00Z' },
    })
  })

  test('skips the upcoming streams that should have started before this hour', async () => {
    await seedVideos([
      createVideoOnYouTube(channel, {
        published_at: '2026-11-15T02:59:59Z',
        status: 'UPCOMING',
      }),
      createVideoOnYouTube(channel, {
        published_at: '2026-11-15T03:00:00Z',
        status: 'UPCOMING',
      }),
      createVideoOnYouTube(otherChannel, {
        published_at: '2026-11-14T10:00:00Z',
        status: 'UPCOMING',
      }),
    ])

    await expect(fetchTalentStreamStatuses()).resolves.toEqual({
      [talent.id]: { isLive: false, nextStreamAt: '2026-11-15T03:00:00Z' },
    })
  })

  test('throws when the videos cannot be fetched', async () => {
    failSupabase('videos', 'failed')

    await expect(fetchTalentStreamStatuses()).rejects.toThrow('failed')
  })
})

describe('fetchTalentStreamStatusesSafe', () => {
  beforeEach(() => {
    mockNow('2026-11-15T03:34:56Z')
  })

  test('returns the stream statuses', async () => {
    await seedVideos([
      createVideoOnYouTube(channel, {
        published_at: '2026-11-15T01:00:00Z',
        status: 'LIVE',
      }),
    ])

    await expect(fetchTalentStreamStatusesSafe()).resolves.toEqual({
      [talent.id]: { isLive: true, nextStreamAt: null },
    })
    expect(logger.error).not.toHaveBeenCalled()
  })

  test('returns no statuses and logs the error when they cannot be fetched', async () => {
    failSupabase('videos', 'failed')

    await expect(fetchTalentStreamStatusesSafe()).resolves.toEqual({})
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to fetch the stream statuses of the talents',
      { error: expect.any(TypeError) },
    )
  })
})

describe('fetchTalentStreamStarts', () => {
  beforeEach(() => {
    // 00:34:56 on 15 November in Japan, so today starts at 15:00 in UTC
    mockNow('2026-11-14T15:34:56Z')
  })

  test('returns the starts of the finished streams of the talent for 90 days before today', async () => {
    const ended = (publishedAt: string, overrides = {}) =>
      createVideoOnYouTube(channel, {
        published_at: publishedAt,
        status: 'ENDED',
        ...overrides,
      })

    await seedVideos([
      ended('2026-11-13T13:00:00Z'),
      // From 0:00 in Japan 90 days before today
      ended('2026-08-16T15:00:00Z'),
      ended('2026-08-16T14:59:59Z'),
      // To 0:00 of today
      ended('2026-11-14T14:59:59Z'),
      ended('2026-11-14T15:00:00Z'),
      ended('2026-11-14T12:00:00Z', { video_kind: 'short' }),
      ended('2026-11-14T12:00:00Z', { status: 'PUBLISHED' }),
      createVideoOnYouTube(otherChannel, {
        published_at: '2026-11-14T12:00:00Z',
        status: 'ENDED',
      }),
    ])

    await expect(fetchTalentStreamStarts(talent.id)).resolves.toEqual([
      '2026-11-14T14:59:59Z',
      '2026-11-13T13:00:00Z',
      '2026-08-16T15:00:00Z',
    ])
  })

  test('is cached for days with the videos tag', async () => {
    await fetchTalentStreamStarts(talent.id)

    expect(cacheLife).toHaveBeenCalledWith('days')
    expect(cacheTag).toHaveBeenCalledWith('videos')
  })

  test('throws when the streams cannot be fetched', async () => {
    failSupabase('videos', 'failed')

    await expect(fetchTalentStreamStarts(talent.id)).rejects.toThrow('failed')
  })
})

describe('fetchDashboardVideos', () => {
  beforeEach(() => {
    mockNow('2026-11-15T12:00:00Z')
  })

  test('returns the live videos, the recent uploads and the recent shorts', async () => {
    const live = createVideoOnYouTube(channel, {
      published_at: '2026-11-15T10:00:00Z',
      status: 'LIVE',
    })
    const recent = createVideoOnYouTube(channel, {
      published_at: '2026-11-13T12:00:00Z',
      status: 'PUBLISHED',
    })
    const newerRecent = createVideoOnTwitch(twitchUser, {
      published_at: '2026-11-15T11:00:00Z',
      status: 'PUBLISHED',
    })
    const short = createVideoOnYouTube(channel, {
      published_at: '2026-11-15T00:00:00Z',
      status: 'PUBLISHED',
      video_kind: 'short',
    })

    await seedVideos([
      live,
      recent,
      newerRecent,
      short,
      // Too old for the recent uploads and the shorts
      createVideoOnYouTube(channel, {
        published_at: '2026-11-12T11:59:59Z',
        status: 'PUBLISHED',
      }),
      createVideoOnYouTube(channel, {
        published_at: '2026-11-14T11:59:59Z',
        status: 'PUBLISHED',
        video_kind: 'short',
      }),
      // Finished streams stay in the lifecycle of the streams
      createVideoOnYouTube(channel, {
        published_at: '2026-11-15T09:00:00Z',
        status: 'ENDED',
      }),
      createVideoOnYouTube(channel, {
        published_at: '2026-11-15T13:00:00Z',
        status: 'UPCOMING',
      }),
    ])

    const videos = await fetchDashboardVideos()

    expect(ids(videos.live)).toEqual([live.video.id])
    expect(ids(videos.recent)).toEqual([newerRecent.video.id, recent.video.id])
    expect(ids(videos.shorts)).toEqual([short.video.id])
  })
})

describe('fetchUpcomingVideos', () => {
  beforeEach(() => {
    // 12:34:56 in Japan, so this hour starts at 03:00 in UTC
    mockNow('2026-11-15T03:34:56Z')
  })

  const upcoming = (publishedAt: string, overrides = {}) =>
    createVideoOnYouTube(channel, {
      duration: 'P0D',
      published_at: publishedAt,
      status: 'UPCOMING',
      ...overrides,
    })

  test('returns the upcoming videos from this hour to a week later by start, with today in Japan', async () => {
    const first = upcoming('2026-11-15T03:00:00Z')
    const second = upcoming('2026-11-16T11:00:00Z')
    const last = upcoming('2026-11-22T03:00:00Z')

    await seedVideos([
      second,
      last,
      first,
      // The streams that should have started before this hour are left out
      upcoming('2026-11-15T02:59:59Z'),
      upcoming('2026-11-22T03:00:01Z'),
      upcoming('2026-11-16T11:00:00Z', { status: 'LIVE' }),
      upcoming('2026-11-16T11:00:00Z', { status: 'ENDED' }),
    ])

    const { today, videos } = await fetchUpcomingVideos()

    expect(today).toBe('2026-11-15')
    expect(ids(videos)).toEqual([
      first.video.id,
      second.video.id,
      last.video.id,
    ])
    expect(cacheLife).toHaveBeenCalledWith('hours')
    expect(cacheTag).toHaveBeenCalledWith('videos')
  })

  test('returns the videos with their thumbnails and channels', async () => {
    const thumbnail = createThumbnail()
    const icon = createProfileImage()
    const video = upcoming('2026-11-16T11:00:00Z', {
      thumbnail_id: thumbnail.id,
      title: '歌枠リレー',
    })

    await seedSupabase({
      profileImages: [icon],
      talents: [talent],
      thumbnails: [thumbnail],
      youtubeChannels: [
        {
          ...channel,
          name: '朝霧ミオ Channel',
          profile_image_id: icon.id,
          youtube_handle: '@mio',
        },
      ],
      ...videoSeed([video]),
    })

    const { videos } = await fetchUpcomingVideos()

    expect(videos).toEqual([
      {
        duration: 'P0D',
        id: video.video.id,
        platform: 'youtube',
        published_at: '2026-11-16T11:00:00Z',
        status: 'UPCOMING',
        talent: { id: talent.id, name: '朝霧ミオ' },
        thumbnail: {
          blur_data_url: thumbnail.blur_data_url,
          height: thumbnail.height,
          id: thumbnail.id,
          path: thumbnail.path,
          width: thumbnail.width,
        },
        title: '歌枠リレー',
        twitch_video: null,
        video_kind: 'standard',
        youtube_video: {
          youtube_channel: {
            name: '朝霧ミオ Channel',
            profile_image: { blur_data_url: icon.blur_data_url, id: icon.id },
            youtube_handle: '@mio',
          },
          youtube_video_id: video.youtubeVideo.youtube_video_id,
        },
      },
    ])
  })

  test('keeps the nearest 100 videos', async () => {
    const rows = Array.from({ length: 101 }, (_, index) =>
      upcoming(
        Temporal.Instant.from('2026-11-16T00:00:00Z')
          .add({ minutes: index })
          .toString(),
      ),
    )

    await seedVideos(rows)

    const { videos } = await fetchUpcomingVideos()

    expect(videos).toHaveLength(100)
    expect(ids(videos)).not.toContain(rows[100]?.video.id)
  })

  test('drops the videos without a YouTube or Twitch video', async () => {
    const shown = upcoming('2026-11-16T11:00:00Z')

    await seedVideos([
      shown,
      createVideo({
        published_at: '2026-11-16T11:00:00Z',
        status: 'UPCOMING',
        talent_id: talent.id,
      }),
    ])

    const { videos } = await fetchUpcomingVideos()

    expect(ids(videos)).toEqual([shown.video.id])
  })

  test('throws when the videos cannot be fetched', async () => {
    failSupabase('videos', 'failed')

    await expect(fetchUpcomingVideos()).rejects.toThrow('failed')
  })
})

describe('fetchScheduleVideos', () => {
  const video = (publishedAt: string, overrides = {}) =>
    createVideoOnYouTube(channel, { published_at: publishedAt, ...overrides })

  test('returns the standard videos of every status from Sunday to Saturday in Japan, by start', async () => {
    // 00:00 on Sunday, 8 November in Japan
    const first = video('2026-11-07T15:00:00Z', { status: 'ENDED' })
    const published = video('2026-11-09T12:00:00Z', { status: 'PUBLISHED' })
    const live = video('2026-11-12T12:00:00Z', { status: 'LIVE' })
    const last = video('2026-11-14T14:59:59Z', { status: 'UPCOMING' })

    await seedVideos([
      last,
      live,
      first,
      published,
      video('2026-11-07T14:59:59Z'),
      // 00:00 on Sunday, 15 November in Japan
      video('2026-11-14T15:00:00Z'),
      video('2026-11-10T12:00:00Z', { video_kind: 'short' }),
    ])

    expect(ids(await fetchScheduleVideos('2026-11-08'))).toEqual([
      first.video.id,
      published.video.id,
      live.video.id,
      last.video.id,
    ])
    expect(cacheLife).toHaveBeenCalledWith('hours')
    expect(cacheTag).toHaveBeenCalledWith('videos')
  })

  test('returns the theme color of the talent without the thumbnail', async () => {
    const thumbnail = createThumbnail()
    const row = video('2026-11-10T12:00:00Z', { thumbnail_id: thumbnail.id })

    await seedSupabase({
      talents: [{ ...talent, theme_color: '#FF6B9D' }],
      thumbnails: [thumbnail],
      youtubeChannels: [channel],
      ...videoSeed([row]),
    })

    const [scheduleVideo] = await fetchScheduleVideos('2026-11-08')

    expect(scheduleVideo).not.toHaveProperty('thumbnail')
    expect(scheduleVideo?.talent).toEqual({
      id: talent.id,
      name: '朝霧ミオ',
      theme_color: '#FF6B9D',
    })
  })

  test('drops the videos without a YouTube or Twitch video', async () => {
    const shown = video('2026-11-10T12:00:00Z')

    await seedVideos([
      shown,
      createVideo({
        published_at: '2026-11-10T12:00:00Z',
        talent_id: talent.id,
      }),
    ])

    expect(ids(await fetchScheduleVideos('2026-11-08'))).toEqual([
      shown.video.id,
    ])
  })

  test('throws when the videos cannot be fetched', async () => {
    failSupabase('videos', 'failed')

    await expect(fetchScheduleVideos('2026-11-08')).rejects.toThrow('failed')
  })
})

describe('fetchOldestVideoDate', () => {
  test('returns the date in Japan the oldest video starts on', async () => {
    await seedVideos([
      createVideoOnYouTube(channel, { published_at: '2020-01-01T00:00:00Z' }),
      // 00:30 on 1 April 2019 in Japan
      createVideoOnYouTube(channel, { published_at: '2019-03-31T15:30:00Z' }),
      createVideoOnYouTube(channel, { published_at: '2019-06-01T00:00:00Z' }),
    ])

    await expect(fetchOldestVideoDate()).resolves.toBe('2019-04-01')
    expect(cacheLife).toHaveBeenCalledWith('days')
    expect(cacheTag).toHaveBeenCalledWith('videos')
  })

  test('returns null without any video', async () => {
    await expect(fetchOldestVideoDate()).resolves.toBeNull()
  })
})

describe('fetchCurrentTime', () => {
  test('returns the current time in Japan', async () => {
    mockNow('2026-11-15T15:30:00Z')

    await expect(fetchCurrentTime()).resolves.toBe(
      '2026-11-16T00:30:00+09:00[Asia/Tokyo]',
    )
    expect(cacheLife).toHaveBeenCalledWith('hours')
  })
})

describe('fetchScheduleToday', () => {
  test('returns today in Japan', async () => {
    // 00:30 on Monday, 16 November 2026 in Japan, still Sunday in UTC
    mockNow('2026-11-15T15:30:00Z')

    await expect(fetchScheduleToday()).resolves.toBe('2026-11-16')
    expect(cacheLife).toHaveBeenCalledWith('minutes')
  })
})
