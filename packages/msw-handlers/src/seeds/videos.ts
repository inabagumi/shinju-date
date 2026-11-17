import { TIME_ZONE } from '@shinju-date/constants'
import type { Tables } from '@shinju-date/database'
import { toDBString } from '@shinju-date/temporal-fns'
import {
  randomBlurDataUrl,
  randomFuture,
  randomLongDuration,
  randomPast,
  randomShortDuration,
  type SeedContext,
} from './context.js'

/** The thumbnails that the videos use in turn. */
export function createThumbnails(context: SeedContext): Tables<'thumbnails'>[] {
  const { faker } = context

  return Array.from({ length: 10 }, () => {
    const createdAt = randomPast(context, 365)

    return {
      blur_data_url: randomBlurDataUrl(context),
      created_at: createdAt,
      deleted_at: null,
      etag: faker.string.alphanumeric(32),
      height: 720,
      id: faker.string.uuid(),
      path: `thumbnails/${faker.string.uuid()}.jpg`,
      updated_at: createdAt,
      width: 1280,
    }
  })
}

/** The item of `items` at `index`, going round them. */
function pick<Item>(items: readonly Item[], index: number): Item {
  const item = items[index % items.length]

  if (item === undefined) {
    throw new TypeError('There are no items to pick from.')
  }

  return item
}

interface VideoValues
  extends Pick<
    Tables<'videos'>,
    'duration' | 'published_at' | 'status' | 'talent_id' | 'title'
  > {
  created_at?: string
  platform?: Tables<'videos'>['platform']
  thumbnail_id: string | null
  updated_at?: string
  video_kind?: Tables<'videos'>['video_kind']
  visible?: boolean
}

/** A video that is not deleted. */
export function createVideo(
  { faker }: SeedContext,
  { created_at: createdAt, updated_at: updatedAt, ...values }: VideoValues,
): Tables<'videos'> {
  return {
    created_at: createdAt ?? values.published_at,
    deleted_at: null,
    deleted_reason: null,
    id: faker.string.uuid(),
    platform: 'youtube',
    updated_at: updatedAt ?? createdAt ?? values.published_at,
    video_kind: 'standard',
    visible: true,
    ...values,
  }
}

const STANDARD_TITLES = [
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
] as const

const SHORT_TITLES = [
  '【切り抜き】面白い瞬間まとめ #shorts',
  '【ダンス】新曲踊ってみた #shorts',
  '【料理】30秒で作れる簡単レシピ #shorts',
  '【メイク】時短メイク術 #shorts',
  '【ゲーム】神プレイ集 #shorts',
  '【歌】歌ってみた #shorts',
  '【日常】今日の出来事 #shorts',
  '【猫】かわいい猫の動画 #shorts',
] as const

interface YouTubeVideosDependencies {
  /** The talents that the videos belong to in turn */
  talents: readonly Tables<'talents'>[]
  thumbnails: readonly Tables<'thumbnails'>[]
}

/**
 * Videos and streams of the talents in turn, of every status. The times
 * follow the status: an upcoming stream starts after `now`, a stream on air
 * started within 3 hours before it, and the others were published before it.
 * The first one is always `UPCOMING` (and hidden), so the seed data has a
 * hidden video.
 */
function createStandardVideos(
  context: SeedContext,
  { talents, thumbnails }: YouTubeVideosDependencies,
): Tables<'videos'>[] {
  const { faker } = context

  return STANDARD_TITLES.map((title, index) => {
    const status =
      index === 0
        ? 'UPCOMING'
        : faker.helpers.arrayElement([
            'PUBLISHED',
            'LIVE',
            'ENDED',
            'UPCOMING',
          ] as const)

    if (status === 'UPCOMING' || status === 'LIVE') {
      return createVideo(context, {
        created_at: randomPast(context, 1),
        duration: 'P0D',
        published_at:
          status === 'UPCOMING'
            ? randomFuture(context, 7)
            : toDBString(
                context.now.subtract({
                  minutes: faker.number.int({ max: 180, min: 1 }),
                }),
              ),
        status,
        talent_id: pick(talents, index).id,
        thumbnail_id: pick(thumbnails, index).id,
        title,
        visible: status === 'LIVE',
      })
    }

    // Some of the published videos are shorts
    const videoKind =
      status === 'PUBLISHED'
        ? faker.helpers.weightedArrayElement([
            { value: 'short' as const, weight: 0.3 },
            { value: 'standard' as const, weight: 0.7 },
          ])
        : 'standard'

    return createVideo(context, {
      duration:
        videoKind === 'short'
          ? randomShortDuration(context)
          : randomLongDuration(context),
      published_at: randomPast(context, 365),
      status,
      talent_id: pick(talents, index).id,
      thumbnail_id: pick(thumbnails, index).id,
      title,
      video_kind: videoKind,
    })
  })
}

/** Shorts published within 2 days, so that there are enough of them. */
function createShorts(
  context: SeedContext,
  { talents, thumbnails }: YouTubeVideosDependencies,
): Tables<'videos'>[] {
  return Array.from({ length: 15 }, (_, index) =>
    createVideo(context, {
      duration: randomShortDuration(context),
      published_at: randomPast(context, 2),
      status: 'PUBLISHED',
      talent_id: pick(talents, index).id,
      thumbnail_id: pick(thumbnails, index).id,
      title: pick(SHORT_TITLES, index),
      video_kind: 'short',
    }),
  )
}

/**
 * The finished streams of the first talent within 90 days before today in
 * Japan, for the tendency of its streams on its page: 10 on Saturdays at
 * 21:00 and 2 on Fridays at 22:00.
 */
function createFinishedStreams(
  context: SeedContext,
  { talents, thumbnails }: YouTubeVideosDependencies,
): Tables<'videos'>[] {
  const [talent] = talents

  if (!talent) {
    return []
  }

  const today = context.now.toZonedDateTimeISO(TIME_ZONE).startOfDay()
  // The latest Saturday before today (`dayOfWeek` is 6 on Saturday)
  const lastSaturday = today.subtract({
    days: (today.dayOfWeek + 7 - 6) % 7 || 7,
  })
  const streams = [
    ...Array.from({ length: 10 }, (_, week) => ({
      start: lastSaturday.subtract({ weeks: week }).with({ hour: 21 }),
      title: '【雑談】土曜の夜の定期配信',
    })),
    ...Array.from({ length: 2 }, (_, week) => ({
      start: lastSaturday.subtract({ days: 1, weeks: week }).with({ hour: 22 }),
      title: '【Minecraft】金曜の夜の建築配信',
    })),
  ]

  return streams.map(({ start, title }, index) =>
    createVideo(context, {
      duration: randomLongDuration(context),
      published_at: toDBString(start),
      status: 'ENDED',
      talent_id: talent.id,
      thumbnail_id: pick(thumbnails, index).id,
      title,
    }),
  )
}

/**
 * The videos on YouTube other than the schedule: videos and streams of
 * every status, shorts, and the finished streams of the first talent.
 */
export function createYouTubeVideos(
  context: SeedContext,
  dependencies: YouTubeVideosDependencies,
): Tables<'videos'>[] {
  return [
    ...createStandardVideos(context, dependencies),
    ...createShorts(context, dependencies),
    ...createFinishedStreams(context, dependencies),
  ]
}

interface LinkYouTubeVideosDependencies {
  videos: readonly Tables<'videos'>[]
  youtubeChannels: readonly Tables<'youtube_channels'>[]
}

/**
 * The `youtube_videos` of the videos on YouTube. Each video belongs to the
 * channel of its talent, so the page of a talent shows its own channel on
 * the cards.
 */
export function linkYouTubeVideos(
  { faker }: SeedContext,
  { videos, youtubeChannels }: LinkYouTubeVideosDependencies,
): Tables<'youtube_videos'>[] {
  return videos.flatMap((video) => {
    const channel = youtubeChannels.find(
      (candidate) => candidate.talent_id === video.talent_id,
    )

    return video.platform === 'youtube' && channel
      ? [
          {
            id: faker.string.uuid(),
            video_id: video.id,
            youtube_channel_id: channel.id,
            youtube_video_id: faker.string.alphanumeric(11),
          },
        ]
      : []
  })
}

interface TwitchVideosDependencies {
  thumbnails: readonly Tables<'thumbnails'>[]
  /** The Twitch users: the first one with an icon, the second without */
  twitchUsers: readonly Tables<'twitch_users'>[]
}

export interface SeedTwitchVideos {
  twitchVideos: Tables<'twitch_videos'>[]
  videos: Tables<'videos'>[]
}

/**
 * Videos on Twitch, which are recent, so they come first in the timeline of
 * the public site. They cover each `type` and `status` that the public site
 * links differently. Both Twitch users have some, so the icon and its
 * fallback can be checked.
 */
export function createTwitchVideos(
  context: SeedContext,
  { thumbnails, twitchUsers }: TwitchVideosDependencies,
): SeedTwitchVideos {
  const { faker, now } = context
  const [userWithIcon, userWithoutIcon] = twitchUsers

  if (!userWithIcon || !userWithoutIcon) {
    return { twitchVideos: [], videos: [] }
  }

  const liveStreamId = faker.string.numeric(11)
  const seeds = [
    {
      // Linked to the channel top, like a video on air
      duration: 'P0D',
      publishedAt: now.add({ hours: 20 }),
      status: 'UPCOMING' as const,
      streamId: null,
      title: '【Twitch】明日の夜は耐久配信！',
      twitchVideoId: faker.string.numeric(10),
      type: null,
      user: userWithIcon,
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
      user: userWithoutIcon,
    },
    {
      duration: 'PT2H34M12S',
      publishedAt: now.subtract({ hours: 6 }),
      status: 'ENDED' as const,
      streamId: faker.string.numeric(11),
      title: '【Twitch】深夜のゲーム配信アーカイブ',
      twitchVideoId: faker.string.numeric(10),
      type: 'archive' as const,
      user: userWithIcon,
    },
    {
      duration: 'PT28S',
      publishedAt: now.subtract({ hours: 9 }),
      status: 'PUBLISHED' as const,
      streamId: null,
      title: '【クリップ】奇跡のワンプレイ',
      twitchVideoId: `${faker.string.alpha(24)}-${faker.string.alphanumeric(16)}`,
      type: 'clip' as const,
      user: userWithIcon,
    },
    {
      duration: 'PT12M5S',
      publishedAt: now.subtract({ hours: 20 }),
      status: 'PUBLISHED' as const,
      streamId: null,
      title: '【Twitch】ハイライト：先週の配信まとめ',
      twitchVideoId: faker.string.numeric(10),
      type: 'highlight' as const,
      user: userWithoutIcon,
    },
    {
      duration: 'PT8M40S',
      publishedAt: now.subtract({ hours: 30 }),
      status: 'PUBLISHED' as const,
      streamId: null,
      title: '【Twitch】アップロード動画：自己紹介',
      twitchVideoId: faker.string.numeric(10),
      type: 'upload' as const,
      user: userWithIcon,
    },
  ]
  const videos = seeds.map((seed, index) =>
    createVideo(context, {
      duration: seed.duration,
      platform: 'twitch',
      published_at: toDBString(seed.publishedAt),
      status: seed.status,
      talent_id: seed.user.talent_id,
      thumbnail_id: pick(thumbnails, index).id,
      title: seed.title,
      updated_at: toDBString(now),
    }),
  )

  return {
    twitchVideos: seeds.flatMap((seed, index) => {
      const video = videos[index]

      return video
        ? [
            {
              id: faker.string.uuid(),
              stream_id: seed.streamId,
              twitch_user_id: seed.user.id,
              twitch_video_id: seed.twitchVideoId,
              type: seed.type,
              video_id: video.id,
            },
          ]
        : []
    }),
    videos,
  }
}
