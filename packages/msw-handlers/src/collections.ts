/**
 * @msw/data collections for mock database
 * Uses Zod schemas for validation and faker for realistic data generation
 */

import { faker } from '@faker-js/faker'
import { Collection } from '@msw/data'
import { TIME_ZONE } from '@shinju-date/constants'
import { Constants } from '@shinju-date/database'
import { z } from 'zod'
import { MOCK_SUPABASE_USER } from './session.js'

// Talents collection
export const talents = new Collection({
  schema: z.object({
    created_at: z.string(),
    deleted_at: z.string().nullable(),
    id: z.string().uuid(),
    name: z.string(),
    reading: z.string().nullable(),
    status: z.enum(Constants.public.Enums.talent_status),
    theme_color: z.string().nullable(),
    updated_at: z.string(),
  }),
})

// Thumbnails collection
export const thumbnails = new Collection({
  schema: z.object({
    blur_data_url: z.string(),
    created_at: z.string(),
    deleted_at: z.string().nullable(),
    etag: z.string().nullable(),
    height: z.number(),
    id: z.string().uuid(),
    path: z.string(),
    updated_at: z.string(),
    width: z.number(),
  }),
})

// Profile images (icons of YouTube channels and Twitch users)
export const profileImages = new Collection({
  schema: z.object({
    blur_data_url: z.string(),
    created_at: z.string(),
    etag: z.string().nullable(),
    height: z.number(),
    id: z.string().uuid(),
    path: z.string(),
    source_url: z.string(),
    updated_at: z.string(),
    width: z.number(),
  }),
})

// Videos collection
export const videos = new Collection({
  schema: z.object({
    created_at: z.string(),
    deleted_at: z.string().nullable(),
    deleted_reason: z
      .enum(Constants.public.Enums.video_deleted_reason)
      .nullable(),
    duration: z.string(),
    id: z.string().uuid(),
    platform: z.enum(Constants.public.Enums.platform_type),
    published_at: z.string(),
    status: z.enum(Constants.public.Enums.video_status),
    talent_id: z.string().uuid(),
    thumbnail_id: z.string().uuid().nullable(),
    title: z.string(),
    updated_at: z.string(),
    video_kind: z.enum(Constants.public.Enums.video_kind),
    visible: z.boolean(),
  }),
})

// YouTube channels collection
export const youtubeChannels = new Collection({
  schema: z.object({
    id: z.string().uuid(),
    name: z.string().nullable(),
    profile_image_id: z.string().uuid().nullable(),
    talent_id: z.string().uuid(),
    youtube_channel_id: z.string(),
    youtube_handle: z.string().nullable(),
  }),
})

// Twitch users collection
export const twitchUsers = new Collection({
  schema: z.object({
    id: z.string().uuid(),
    name: z.string().nullable(),
    profile_image_id: z.string().uuid().nullable(),
    talent_id: z.string().uuid(),
    twitch_login_name: z.string().nullable(),
    twitch_user_id: z.string(),
  }),
})

// Backfill jobs that finished (history recorded by the batch app)
export const videoBackfillJobs = new Collection({
  schema: z.object({
    account_id: z.string().uuid(),
    added: z.number(),
    created_at: z.string(),
    error: z.string().nullable(),
    finished_at: z.string(),
    id: z.string().uuid(),
    pages: z.number(),
    platform: z.enum(Constants.public.Enums.platform_type),
    requested_at: z.string(),
    requested_by: z.string().nullable(),
    run_id: z.string().uuid().nullable(),
    started_at: z.string().nullable(),
    status: z.enum(Constants.public.Enums.video_backfill_job_status),
    talent_id: z.string().uuid(),
  }),
})

// YouTube videos collection
export const youtubeVideos = new Collection({
  schema: z.object({
    id: z.string().uuid(),
    video_id: z.string().uuid(),
    youtube_channel_id: z.string(),
    youtube_video_id: z.string(),
  }),
})

// Twitch videos collection
export const twitchVideos = new Collection({
  schema: z.object({
    id: z.string().uuid(),
    stream_id: z.string().nullable(),
    twitch_user_id: z.string().uuid(),
    twitch_video_id: z.string(),
    type: z.enum(Constants.public.Enums.twitch_video_type).nullable(),
    video_id: z.string().uuid(),
  }),
})

// Terms collection
export const terms = new Collection({
  schema: z.object({
    created_at: z.string(),
    id: z.string().uuid(),
    popularity: z.number(),
    readings: z.array(z.string()),
    synonyms: z.array(z.string()),
    term: z.string(),
    updated_at: z.string(),
  }),
})

// Announcements collection
export const announcements = new Collection({
  schema: z.object({
    created_at: z.string().nullable(),
    enabled: z.boolean(),
    end_at: z.string(),
    id: z.string().uuid(),
    level: z.string(),
    message: z.string(),
    start_at: z.string(),
    updated_at: z.string().nullable(),
  }),
})

// Feature requests sent from the feedback form of the public site
export const featureRequests = new Collection({
  schema: z.object({
    admin_memo: z.string().nullable(),
    created_at: z.string(),
    id: z.string().uuid(),
    is_read: z.boolean(),
    message: z.string(),
    status: z.enum(Constants.public.Enums.feature_request_status),
    updated_at: z.string(),
  }),
})

// Audit logs of the admin app
export const auditLogs = new Collection({
  schema: z.object({
    action: z.string(),
    created_at: z.string(),
    details: z.unknown(),
    id: z.string().uuid(),
    target_record_id: z.string().nullable(),
    target_table: z.string().nullable(),
    // The ID of the mock user is not a UUID
    user_id: z.string().nullable(),
  }),
})

/**
 * Define relations between collections using @msw/data's built-in relation API
 *
 * Note: @msw/data v1.1.2's relation system requires relations to be defined
 * in the schema itself using getters. However, we're using a manual approach
 * here by storing relation data in the primary key field during seeding.
 *
 * The automatic relation resolution through schema is not used in this implementation
 * because it would require restructuring all our Zod schemas to include getter-based
 * relation properties, which would be a breaking change.
 *
 * Instead, the relations are listed in the table definitions
 * (`handlers/supabase/tables.ts`), and embedded resources are looked up from
 * them (e.g., `videos.talent_id` -> `talents.id`).
 */
export function defineCollectionRelations() {
  // Relations are listed in handlers/supabase/tables.ts
}

/**
 * IDs of the seeded active talents, in the order of their readings
 * (あさぎりみお, かざはなりつ, しらつゆねね, なぎさわゆら).
 *
 * - The first one has a YouTube channel and a Twitch user, both with icons
 * - The second one has a YouTube channel with an icon and a Twitch user
 *   without one
 * - The last one has only a YouTube channel without an icon
 *
 * The first one also has finished streams within 90 days, mostly on Saturday
 * at 21:00 in Japan, for the tendency of its streams on its page.
 */
export const MOCK_TALENT_IDS = [
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000004',
] as const

/** ID of the seeded talent whose status is `retired` */
export const MOCK_RETIRED_TALENT_ID = '00000000-0000-4000-8000-000000000005'

/** ID of the seeded talent that is deleted (`deleted_at` is set) */
export const MOCK_DELETED_TALENT_ID = '00000000-0000-4000-8000-000000000006'

/** ID of the seeded active talent that has no channels or videos */
export const MOCK_TALENT_WITHOUT_VIDEOS_ID =
  '00000000-0000-4000-8000-000000000007'

/**
 * When the seeded stream on the schedule that is on air now starts: 30
 * minutes before `now`, but within the day of `now`, so that the hour the
 * schedule draws it for (from its start) does not cross the end of the day.
 * It is never later than `now`, and is in the current week even right after
 * the week starts on Sunday.
 */
export function getLiveScheduleStart(
  now: Temporal.ZonedDateTime,
): Temporal.ZonedDateTime {
  const dayStart = now.startOfDay()
  // The latest start whose hour ends by the end of the day
  const latestStart = dayStart.add({ days: 1 }).subtract({ hours: 1 })
  const start = now.subtract({ minutes: 30 })

  if (Temporal.ZonedDateTime.compare(start, dayStart) < 0) {
    return dayStart
  }

  if (Temporal.ZonedDateTime.compare(start, latestStart) > 0) {
    return latestStart
  }

  return start
}

let seeding: Promise<void> | undefined

/**
 * Seed the collections only once, even when several handlers need them.
 * The Redis mock waits for this as well so that its click data uses the IDs
 * of the seeded videos and talents.
 */
export function ensureCollectionsSeeded(): Promise<void> {
  seeding ??= seedCollections()

  return seeding
}

/**
 * Seed all collections with initial mock data using faker
 * Relations are automatically established via defineCollectionRelations()
 */
export async function seedCollections() {
  // Define relations first
  defineCollectionRelations()
  // Create talents
  const talentNames = ['朝霧ミオ', '風花リツ', '白露ネネ', '凪沢ユラ']
  const talentReadings = [
    'あさぎりみお',
    'かざはなりつ',
    'しらつゆねね',
    'なぎさわゆら',
  ]
  const themeColors = ['#FF6B9D', '#87CEEB', '#98D8C8', '#FFB6C1']
  const createdTalents = await Promise.all(
    talentNames.map((name, idx) =>
      talents.create({
        created_at: faker.date.past({ years: 2 }).toISOString(),
        deleted_at: null,
        // Fixed so that E2E tests can open the page of a talent
        // (`MOCK_TALENT_IDS`)
        id: MOCK_TALENT_IDS[idx] ?? faker.string.uuid(),
        name,
        reading: talentReadings[idx] ?? null,
        status: 'active',
        theme_color: themeColors[idx] ?? null,
        updated_at: faker.date.recent().toISOString(),
      }),
    ),
  )

  // A retired talent and a deleted talent, which the public site does not
  // show, and an active talent that has just been added. They have no
  // channels, videos or readings, so the new talent comes last on the list of
  // talents.
  await Promise.all([
    talents.create({
      created_at: faker.date.recent({ days: 7 }).toISOString(),
      deleted_at: null,
      id: MOCK_TALENT_WITHOUT_VIDEOS_ID,
      name: '動画のないタレント',
      reading: null,
      status: 'active',
      theme_color: null,
      updated_at: faker.date.recent().toISOString(),
    }),
    talents.create({
      created_at: faker.date.past({ years: 3 }).toISOString(),
      deleted_at: null,
      id: MOCK_RETIRED_TALENT_ID,
      name: '引退したタレント',
      reading: null,
      status: 'retired',
      theme_color: null,
      updated_at: faker.date.recent().toISOString(),
    }),
    talents.create({
      created_at: faker.date.past({ years: 3 }).toISOString(),
      deleted_at: faker.date.recent({ days: 30 }).toISOString(),
      id: MOCK_DELETED_TALENT_ID,
      name: '削除したタレント',
      reading: null,
      status: 'active',
      theme_color: null,
      updated_at: faker.date.recent().toISOString(),
    }),
  ])

  // Create thumbnails
  const createdThumbnails = await Promise.all(
    Array.from({ length: 10 }, async () => {
      return thumbnails.create({
        blur_data_url: `data:image/jpeg;base64,${faker.string.alphanumeric(50)}`,
        created_at: faker.date.past({ years: 1 }).toISOString(),
        deleted_at: null,
        etag: faker.string.alphanumeric(32),
        height: 720,
        id: faker.string.uuid(),
        path: `thumbnails/${faker.string.uuid()}.jpg`,
        updated_at: faker.date.recent().toISOString(),
        width: 1280,
      })
    }),
  )

  // Create videos
  const videoTitles = [
    '【歌枠】アニソン縛り歌ってみた！',
    '【Minecraft】新拠点建設！',
    '【雑談】最近のこと話します',
    '【APEX】ランクマ配信',
    '【プロセカ】イベント走ります',
    '【ASMR】ぐっすり眠れる囁き',
    '【料理】簡単パスタ作ってみた',
    '【ゲーム】ホラーゲーム初見プレイ',
    '【お絵描き】リスナーさんのイラスト描く',
    '【コラボ】〇〇ちゃんと遊ぶ！',
  ]

  await Promise.all(
    Array.from({ length: 10 }, async (_, idx) => {
      const talent = createdTalents[idx % createdTalents.length]
      if (!talent) return

      const thumbnail = createdThumbnails[idx % createdThumbnails.length]
      // The first video is always `UPCOMING` (hidden), so the seeded data has
      // a hidden video whatever the other statuses are.
      const status =
        idx === 0
          ? 'UPCOMING'
          : faker.helpers.arrayElement([
              'PUBLISHED',
              'LIVE',
              'ENDED',
              'UPCOMING',
            ] as const)

      // Make some videos shorts (30% chance) using weightedArrayElement for clarity
      const videoKind = faker.helpers.weightedArrayElement([
        { value: 'short', weight: 0.3 },
        { value: 'standard', weight: 0.7 },
      ])

      return videos.create({
        created_at: faker.date.past({ years: 1 }).toISOString(),
        deleted_at: null,
        deleted_reason: null,
        duration:
          videoKind === 'short'
            ? `PT${faker.number.int({ max: 60, min: 15 })}S` // Shorts are 15-60 seconds
            : `PT${faker.number.int({ max: 3, min: 1 })}H${faker.number.int({ max: 59, min: 0 })}M${faker.number.int({ max: 59, min: 0 })}S`,
        id: faker.string.uuid(),
        platform: 'youtube',
        published_at: faker.date.past({ years: 1 }).toISOString(),
        status,
        talent_id: talent.id,
        thumbnail_id: thumbnail?.id ?? null,
        title: videoTitles[idx] ?? faker.lorem.sentence(),
        updated_at: faker.date.recent().toISOString(),
        video_kind: videoKind,
        visible:
          status === 'PUBLISHED' || status === 'LIVE' || status === 'ENDED',
      })
    }),
  )

  // Create additional shorts videos to ensure we have enough for testing
  const shortsTitles = [
    '【切り抜き】面白い瞬間まとめ #shorts',
    '【ダンス】新曲踊ってみた #shorts',
    '【料理】30秒で作れる簡単レシピ #shorts',
    '【メイク】時短メイク術 #shorts',
    '【ゲーム】神プレイ集 #shorts',
    '【歌】歌ってみた #shorts',
    '【日常】今日の出来事 #shorts',
    '【猫】かわいい猫の動画 #shorts',
  ]

  await Promise.all(
    Array.from({ length: 15 }, async (_, idx) => {
      const talent = createdTalents[idx % createdTalents.length]
      if (!talent) return

      const thumbnail = createdThumbnails[idx % createdThumbnails.length]

      return videos.create({
        created_at: faker.date.recent({ days: 2 }).toISOString(),
        deleted_at: null,
        deleted_reason: null,
        duration: `PT${faker.number.int({ max: 60, min: 15 })}S`,
        id: faker.string.uuid(),
        platform: 'youtube',
        published_at: faker.date.recent({ days: 2 }).toISOString(),
        status: 'PUBLISHED',
        talent_id: talent.id,
        thumbnail_id: thumbnail?.id ?? null,
        title:
          shortsTitles[idx % shortsTitles.length] ?? faker.lorem.sentence(),
        updated_at: faker.date.recent().toISOString(),
        video_kind: 'short',
        visible: true,
      })
    }),
  )

  // Streams for the schedule of the public site: 2 on each day of the current
  // week (from Sunday to Saturday in Japan), 1 in each of the previous and the
  // next weeks, and 1 on air now (`getLiveScheduleStart`, so that the hour it
  // is drawn for stays within today). They are created before the YouTube
  // videos below, so they get youtube_videos rows. Their status follows the
  // start: `ENDED` before now and `UPCOMING` after it.
  const scheduleNow = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
  const weekStart = scheduleNow
    .toPlainDate()
    .subtract({ days: scheduleNow.dayOfWeek % 7 })
    .toZonedDateTime(TIME_ZONE)
  // Some streams of different days start in the same hour, so the rows of the
  // hours on the schedule can be checked
  const scheduleStarts = [
    ...Array.from({ length: 7 }, (_, day) => [
      weekStart.add({ days: day, hours: 12 + (day % 3) * 2 }),
      weekStart.add({ days: day, hours: 21 }),
    ]).flat(),
    weekStart.subtract({ days: 5 }).add({ hours: 20 }),
    weekStart.add({ days: 9, hours: 20 }),
    // 3 more at 21:00 on Wednesday, so 4 streams start at the same time
    ...Array.from({ length: 3 }, () => weekStart.add({ days: 3, hours: 21 })),
  ]
  const scheduleTitles = [
    '【定期】朝の雑談',
    '【歌枠】リクエスト歌枠',
    '【ゲーム】RPG 実況',
    '【雑談】週末のふりかえり',
  ]
  const scheduleSeeds = [
    ...scheduleStarts.map((start) => ({
      publishedAt: start.toInstant(),
      status:
        Temporal.ZonedDateTime.compare(start, scheduleNow) < 0
          ? ('ENDED' as const)
          : ('UPCOMING' as const),
    })),
    {
      publishedAt: getLiveScheduleStart(scheduleNow).toInstant(),
      status: 'LIVE' as const,
    },
  ]

  await Promise.all(
    scheduleSeeds.map(async ({ publishedAt, status }, idx) => {
      const talent = createdTalents[idx % createdTalents.length]
      if (!talent) return

      return videos.create({
        created_at: publishedAt.toString(),
        deleted_at: null,
        deleted_reason: null,
        duration: status === 'ENDED' ? 'PT1H30M0S' : 'P0D',
        id: faker.string.uuid(),
        platform: 'youtube',
        published_at: publishedAt.toString(),
        status,
        talent_id: talent.id,
        thumbnail_id:
          createdThumbnails[idx % createdThumbnails.length]?.id ?? null,
        title:
          status === 'LIVE'
            ? '【スケジュール】ただいま配信中'
            : idx === scheduleStarts.length - 1
              ? // Long enough to check that it does not run out of the item
                '〖FORKROAD〗右か左かすきなほうをえらんでね【#ななしいんく公式チャンネル同時視聴コラボ】'
              : `${scheduleTitles[idx % scheduleTitles.length]} #${idx + 1}`,
        updated_at: publishedAt.toString(),
        video_kind: 'standard',
        visible: true,
      })
    }),
  )

  // Create the finished streams of the first talent within 90 days before
  // today in Japan, for the tendency of its streams on its page: 10 on
  // Saturdays at 21:00 and 2 on Fridays at 22:00. They are created before the
  // YouTube videos below, so each of them gets one.
  const [talentWithStreams] = createdTalents

  if (talentWithStreams) {
    const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE).startOfDay()
    // The latest Saturday before today (`dayOfWeek` is 6 on Saturday)
    const lastSaturday = today.subtract({
      days: (today.dayOfWeek + 7 - 6) % 7 || 7,
    })
    const streamSeeds = [
      ...Array.from({ length: 10 }, (_, week) => ({
        start: lastSaturday.subtract({ weeks: week }).with({ hour: 21 }),
        title: '【雑談】土曜の夜の定期配信',
      })),
      ...Array.from({ length: 2 }, (_, week) => ({
        start: lastSaturday
          .subtract({ days: 1, weeks: week })
          .with({ hour: 22 }),
        title: '【Minecraft】金曜の夜の建築配信',
      })),
    ]

    await Promise.all(
      streamSeeds.map(({ start, title }, idx) => {
        const thumbnail = createdThumbnails[idx % createdThumbnails.length]
        const publishedAt = start.toInstant().toString()

        return videos.create({
          created_at: publishedAt,
          deleted_at: null,
          deleted_reason: null,
          duration: `PT${faker.number.int({ max: 3, min: 1 })}H${faker.number.int({ max: 59, min: 0 })}M${faker.number.int({ max: 59, min: 0 })}S`,
          id: faker.string.uuid(),
          platform: 'youtube',
          published_at: publishedAt,
          status: 'ENDED',
          talent_id: talentWithStreams.id,
          thumbnail_id: thumbnail?.id ?? null,
          title,
          updated_at: publishedAt,
          video_kind: 'standard',
          visible: true,
        })
      }),
    )
  }

  // Create YouTube channels. The last one has no icon, so the default icon
  // fallback can be checked as well.
  const createdChannels = await Promise.all(
    createdTalents.map(async (talent, idx) => {
      const youtubeChannelId = `UC${faker.string.alphanumeric(22)}`
      const profileImage =
        idx < createdTalents.length - 1
          ? await profileImages.create({
              blur_data_url: `data:image/jpeg;base64,${faker.string.alphanumeric(50)}`,
              created_at: faker.date.past({ years: 1 }).toISOString(),
              etag: `"${faker.string.alphanumeric(32)}"`,
              height: 256,
              id: faker.string.uuid(),
              path: `youtube/${youtubeChannelId}/${faker.string.alphanumeric(21)}.webp`,
              source_url: `https://yt3.ggpht.com/${faker.string.alphanumeric(40)}=s800-c-k-c0x00ffffff-no-rj`,
              updated_at: faker.date.recent().toISOString(),
              width: 256,
            })
          : null

      return youtubeChannels.create({
        id: faker.string.uuid(),
        name: talent.name,
        profile_image_id: profileImage?.id ?? null,
        talent_id: talent.id,
        youtube_channel_id: youtubeChannelId,
        youtube_handle: `@${faker.internet.username()}`,
      })
    }),
  )

  // Create Twitch users for the first two talents. Only the first one has
  // an icon, so the default icon fallback can be checked as well.
  const createdTwitchUsers = await Promise.all(
    createdTalents.slice(0, 2).map(async (talent, idx) => {
      const twitchUserId = faker.string.numeric(9)
      const login = faker.internet.username().toLowerCase()
      const profileImage =
        idx === 0
          ? await profileImages.create({
              blur_data_url: `data:image/jpeg;base64,${faker.string.alphanumeric(50)}`,
              created_at: faker.date.past({ years: 1 }).toISOString(),
              etag: `"${faker.string.alphanumeric(32)}"`,
              height: 256,
              id: faker.string.uuid(),
              path: `twitch/${twitchUserId}/${faker.string.alphanumeric(21)}.webp`,
              source_url: `https://static-cdn.jtvnw.net/jtv_user_pictures/${faker.string.uuid()}-profile_image-300x300.png`,
              updated_at: faker.date.recent().toISOString(),
              width: 256,
            })
          : null

      return twitchUsers.create({
        id: faker.string.uuid(),
        name: talent.name,
        profile_image_id: profileImage?.id ?? null,
        talent_id: talent.id,
        twitch_login_name: login,
        twitch_user_id: twitchUserId,
      })
    }),
  )

  // Create the history of backfill jobs: a channel that was backfilled, and
  // a Twitch user whose latest backfill failed after an earlier one succeeded,
  // so that the failure alert and the bulk retry can be checked.
  const backfilledChannel = createdChannels[0]
  const failedTwitchUser = createdTwitchUsers[1]

  if (backfilledChannel && failedTwitchUser) {
    const backfills = [
      {
        account_id: backfilledChannel.id,
        added: 128,
        error: null,
        hoursAgo: 30,
        pages: 3,
        platform: 'youtube' as const,
        status: 'done' as const,
        talent_id: backfilledChannel.talent_id,
      },
      {
        account_id: failedTwitchUser.id,
        added: 40,
        error: null,
        hoursAgo: 48,
        pages: 1,
        platform: 'twitch' as const,
        status: 'done' as const,
        talent_id: failedTwitchUser.talent_id,
      },
      {
        account_id: failedTwitchUser.id,
        added: 2,
        error: 'Twitch API request failed with status 503',
        hoursAgo: 6,
        pages: 1,
        platform: 'twitch' as const,
        status: 'failed' as const,
        talent_id: failedTwitchUser.talent_id,
      },
    ]

    await Promise.all(
      backfills.map(({ hoursAgo, ...backfill }) => {
        const finishedAt = Temporal.Now.instant().subtract({ hours: hoursAgo })
        const requestedAt = finishedAt.subtract({ minutes: 10 })

        return videoBackfillJobs.create({
          ...backfill,
          created_at: finishedAt.toString(),
          finished_at: finishedAt.toString(),
          id: faker.string.uuid(),
          requested_at: requestedAt.toString(),
          requested_by: null,
          run_id: null,
          started_at: requestedAt.toString(),
        })
      }),
    )
  }

  // Create YouTube videos (relations). Each video belongs to the channel of
  // its talent, so the page of a talent shows its own channel on the cards.
  const allVideos = await videos.findMany()
  const findChannelOfVideo = (video: (typeof allVideos)[number]) =>
    createdChannels.find((channel) => channel.talent_id === video.talent_id)

  // Create specific test data that tests expect
  const testYoutubeVideoIds = ['YT_video1abc', 'YT_video2def', 'YT_video3ghi']
  await Promise.all(
    allVideos.slice(0, 3).map((video, idx) => {
      const channel = findChannelOfVideo(video)
      if (!channel) return Promise.resolve()

      return youtubeVideos.create({
        id: faker.string.uuid(),
        video_id: video.id,
        youtube_channel_id: channel.id,
        youtube_video_id:
          testYoutubeVideoIds[idx] ?? faker.string.alphanumeric(11),
      })
    }),
  )

  // Create remaining YouTube videos with random IDs
  await Promise.all(
    allVideos.slice(3).map((video) => {
      const channel = findChannelOfVideo(video)
      if (!channel) return Promise.resolve()

      return youtubeVideos.create({
        id: faker.string.uuid(),
        video_id: video.id,
        youtube_channel_id: channel.id,
        youtube_video_id: faker.string.alphanumeric(11),
      })
    }),
  )

  // Create Twitch videos after the YouTube ones above, so that none of them
  // gets a youtube_videos row. They are recent, so they come first in the
  // timeline of the public site, and cover each `type` and `status` that the
  // public site links differently. Both Twitch users have some, so the icon
  // and its fallback can be checked.
  const [twitchUserWithIcon, twitchUserWithoutIcon] = createdTwitchUsers

  if (twitchUserWithIcon && twitchUserWithoutIcon) {
    const now = Temporal.Now.instant()
    const liveStreamId = faker.string.numeric(11)
    const twitchVideoSeeds = [
      {
        // Linked to the channel top, like a video on air
        duration: 'P0D',
        publishedAt: now.add({ hours: 20 }),
        status: 'UPCOMING' as const,
        streamId: null,
        title: '【Twitch】明日の夜は耐久配信！',
        twitchVideoId: faker.string.numeric(10),
        type: null,
        user: twitchUserWithIcon,
      },
      {
        // On air: the batch app keeps a placeholder until the archive appears
        duration: 'P0D',
        publishedAt: now.subtract({ minutes: 45 }),
        status: 'LIVE' as const,
        streamId: liveStreamId,
        title: '【Twitch】まったり雑談配信中',
        twitchVideoId: `live:${liveStreamId}`,
        type: null,
        user: twitchUserWithoutIcon,
      },
      {
        duration: 'PT2H34M12S',
        publishedAt: now.subtract({ hours: 6 }),
        status: 'ENDED' as const,
        streamId: faker.string.numeric(11),
        title: '【Twitch】深夜のゲーム配信アーカイブ',
        twitchVideoId: faker.string.numeric(10),
        type: 'archive' as const,
        user: twitchUserWithIcon,
      },
      {
        duration: 'PT28S',
        publishedAt: now.subtract({ hours: 9 }),
        status: 'PUBLISHED' as const,
        streamId: null,
        title: '【クリップ】奇跡のワンプレイ',
        twitchVideoId: `${faker.string.alpha(24)}-${faker.string.alphanumeric(16)}`,
        type: 'clip' as const,
        user: twitchUserWithIcon,
      },
      {
        duration: 'PT12M5S',
        publishedAt: now.subtract({ hours: 20 }),
        status: 'PUBLISHED' as const,
        streamId: null,
        title: '【Twitch】ハイライト：先週の配信まとめ',
        twitchVideoId: faker.string.numeric(10),
        type: 'highlight' as const,
        user: twitchUserWithoutIcon,
      },
      {
        duration: 'PT8M40S',
        publishedAt: now.subtract({ hours: 30 }),
        status: 'PUBLISHED' as const,
        streamId: null,
        title: '【Twitch】アップロード動画：自己紹介',
        twitchVideoId: faker.string.numeric(10),
        type: 'upload' as const,
        user: twitchUserWithIcon,
      },
    ]

    await Promise.all(
      twitchVideoSeeds.map(async (seed, idx) => {
        const thumbnail = createdThumbnails[idx % createdThumbnails.length]
        const video = await videos.create({
          created_at: seed.publishedAt.toString(),
          deleted_at: null,
          deleted_reason: null,
          duration: seed.duration,
          id: faker.string.uuid(),
          platform: 'twitch',
          published_at: seed.publishedAt.toString(),
          status: seed.status,
          talent_id: seed.user.talent_id,
          thumbnail_id: thumbnail?.id ?? null,
          title: seed.title,
          updated_at: now.toString(),
          video_kind: 'standard',
          visible: true,
        })

        return twitchVideos.create({
          id: faker.string.uuid(),
          stream_id: seed.streamId,
          twitch_user_id: seed.user.id,
          twitch_video_id: seed.twitchVideoId,
          type: seed.type,
          video_id: video.id,
        })
      }),
    )
  }

  // Create terms
  const termsList = [
    {
      readings: ['うたわく'],
      synonyms: ['歌配信', 'カラオケ配信'],
      term: '歌枠',
    },
    {
      readings: ['げーむはいしん'],
      synonyms: ['ゲーム実況'],
      term: 'ゲーム配信',
    },
    { readings: ['こらぼ'], synonyms: ['コラボ配信', '共演'], term: 'コラボ' },
    { readings: ['えーえすえむあーる'], synonyms: ['音フェチ'], term: 'ASMR' },
  ]

  const createdTerms = await Promise.all(
    termsList.map((termData) =>
      terms.create({
        created_at: faker.date.past({ years: 1 }).toISOString(),
        id: faker.string.uuid(),
        popularity: 0,
        readings: termData.readings,
        synonyms: termData.synonyms,
        term: termData.term,
        updated_at: faker.date.recent().toISOString(),
      }),
    ),
  )

  // Create announcements
  await announcements.create({
    created_at: faker.date.past().toISOString(),
    enabled: true,
    end_at: faker.date.future().toISOString(),
    id: faker.string.uuid(),
    level: 'info',
    // Contains a link and GFM syntax (strikethrough) so that the rendering of
    // the Markdown message can be checked
    message:
      'メンテナンスのお知らせ: 日時は~~11月20日~~11月27日に変わりました。詳しくは[メンテナンス情報](https://example.com/maintenance)をご覧ください。',
    start_at: faker.date.recent().toISOString(),
    updated_at: faker.date.recent().toISOString(),
  })

  // Create feature requests: one that has not been read yet, and one that
  // has been handled with a memo, so both states of the list can be checked.
  const now = Temporal.Now.instant()
  const featureRequestSeeds = [
    {
      admin_memo: null,
      hoursAgo: 3,
      is_read: false,
      message: '配信予定をカレンダーアプリに登録できるようにしてほしいです。',
      status: 'pending' as const,
    },
    {
      admin_memo: '検索画面のタレント絞り込みで対応済み。',
      hoursAgo: 72,
      is_read: true,
      message:
        '特定のタレントの動画だけを表示できるようにしてください。\n\n- 複数選択できると嬉しいです',
      status: 'resolved' as const,
    },
  ]

  await Promise.all(
    featureRequestSeeds.map(({ hoursAgo, ...seed }) => {
      const createdAt = now.subtract({ hours: hoursAgo }).toString()

      return featureRequests.create({
        ...seed,
        created_at: createdAt,
        id: faker.string.uuid(),
        updated_at: createdAt,
      })
    }),
  )

  // Create audit logs of the mock user, shaped like the ones the admin app
  // records, so that the recent activity of the system page can be checked.
  const [updatedTalent] = createdTalents
  const [createdTerm] = createdTerms
  const [hiddenVideo] = await videos.findMany()
  const auditLogSeeds = [
    {
      action: 'CHANNEL_UPDATE',
      details: updatedTalent ? { entityName: updatedTalent.name } : null,
      minutesAgo: 15,
      target_record_id: updatedTalent?.id ?? null,
      target_table: 'talents',
    },
    {
      action: 'VIDEO_VISIBILITY_TOGGLE',
      details: hiddenVideo ? { entityName: hiddenVideo.title } : null,
      minutesAgo: 90,
      target_record_id: hiddenVideo?.id ?? null,
      target_table: 'videos',
    },
    {
      action: 'TERM_CREATE',
      details: createdTerm ? { entityName: createdTerm.term } : null,
      minutesAgo: 60 * 26,
      target_record_id: createdTerm?.id ?? null,
      target_table: 'terms',
    },
    {
      action: 'MAINTENANCE_MODE_ENABLE',
      details: null,
      minutesAgo: 60 * 24 * 5,
      target_record_id: null,
      target_table: 'redis:system',
    },
  ]

  await Promise.all(
    auditLogSeeds.map(({ minutesAgo, ...seed }) =>
      auditLogs.create({
        ...seed,
        created_at: now.subtract({ minutes: minutesAgo }).toString(),
        id: faker.string.uuid(),
        user_id: MOCK_SUPABASE_USER.id,
      }),
    ),
  )
}
