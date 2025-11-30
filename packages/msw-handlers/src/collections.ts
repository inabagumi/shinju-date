/**
 * @msw/data collections for mock database
 * Uses Zod schemas for validation and faker for realistic data generation
 */

import { faker } from '@faker-js/faker'
import { Collection } from '@msw/data'
import { z } from 'zod'

// Talents collection
export const talents = new Collection({
  schema: z.object({
    created_at: z.string(),
    deleted_at: z.string().nullable(),
    id: z.string().uuid(),
    name: z.string(),
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

// Videos collection
export const videos = new Collection({
  schema: z.object({
    created_at: z.string(),
    deleted_at: z.string().nullable(),
    duration: z.string(),
    id: z.string().uuid(),
    platform: z.enum(['YOUTUBE', 'TWITCH']).nullable(),
    published_at: z.string(),
    status: z.enum(['PUBLISHED', 'LIVE', 'ENDED', 'SCHEDULED']),
    talent_id: z.string().uuid(),
    thumbnail_id: z.string().uuid().nullable(),
    title: z.string(),
    updated_at: z.string(),
    visible: z.boolean(),
  }),
})

// YouTube channels collection
export const youtubeChannels = new Collection({
  schema: z.object({
    id: z.string().uuid(),
    name: z.string().nullable(),
    talent_id: z.string().uuid(),
    youtube_channel_id: z.string(),
    youtube_handle: z.string().nullable(),
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

// Terms collection
export const terms = new Collection({
  schema: z.object({
    created_at: z.string(),
    id: z.string().uuid(),
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

/**
 * Define relations between collections using @msw/data's built-in relation API
 * This provides automatic relation traversal and query capabilities
 */
export function defineCollectionRelations() {
  // Videos -> Talent (many-to-one)
  videos.relate('talent', talents, {
    field: 'talent_id',
    foreignKey: 'id',
    type: 'one-of',
  })

  // Videos -> Thumbnail (many-to-one)
  videos.relate('thumbnail', thumbnails, {
    field: 'thumbnail_id',
    foreignKey: 'id',
    type: 'one-of',
  })

  // YouTubeVideos -> Videos (many-to-one)
  youtubeVideos.relate('video', videos, {
    field: 'video_id',
    foreignKey: 'id',
    type: 'one-of',
  })

  // YouTubeChannels -> Talent (many-to-one)
  youtubeChannels.relate('talent', talents, {
    field: 'talent_id',
    foreignKey: 'id',
    type: 'one-of',
  })

  // Reverse relations
  // Talents -> Videos (one-to-many)
  talents.relate('videos', videos, {
    field: 'id',
    foreignKey: 'talent_id',
    type: 'many-of',
  })

  // Talents -> YouTube Channels (one-to-many)
  talents.relate('youtubeChannels', youtubeChannels, {
    field: 'id',
    foreignKey: 'talent_id',
    type: 'many-of',
  })

  // Videos -> YouTube Videos (one-to-many)
  videos.relate('youtubeVideos', youtubeVideos, {
    field: 'id',
    foreignKey: 'video_id',
    type: 'many-of',
  })
}

/**
 * Seed all collections with initial mock data using faker
 * Relations are automatically established via defineCollectionRelations()
 */
export async function seedCollections() {
  // Define relations first
  defineCollectionRelations()
  // Create talents
  const talentNames = ['一ノ瀬うるは', '飛良ひかり', '小森めと', '英リサ']
  const createdTalents = await Promise.all(
    talentNames.map((name) =>
      talents.create({
        created_at: faker.date.past({ years: 2 }).toISOString(),
        deleted_at: null,
        id: faker.string.uuid(),
        name,
        updated_at: faker.date.recent().toISOString(),
      }),
    ),
  )

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
      const status = faker.helpers.arrayElement([
        'PUBLISHED',
        'LIVE',
        'ENDED',
        'SCHEDULED',
      ] as const)

      return videos.create({
        created_at: faker.date.past({ years: 1 }).toISOString(),
        deleted_at: null,
        duration: `PT${faker.number.int({ max: 3, min: 1 })}H${faker.number.int({ max: 59, min: 0 })}M${faker.number.int({ max: 59, min: 0 })}S`,
        id: faker.string.uuid(),
        platform: 'YOUTUBE',
        published_at: faker.date.past({ years: 1 }).toISOString(),
        status,
        talent_id: talent.id,
        thumbnail_id: thumbnail?.id ?? null,
        title: videoTitles[idx] ?? faker.lorem.sentence(),
        updated_at: faker.date.recent().toISOString(),
        visible:
          status === 'PUBLISHED' || status === 'LIVE' || status === 'ENDED',
      })
    }),
  )

  // Create YouTube channels
  const createdChannels = await Promise.all(
    createdTalents.map((talent) =>
      youtubeChannels.create({
        id: faker.string.uuid(),
        name: talent.name,
        talent_id: talent.id,
        youtube_channel_id: `UC${faker.string.alphanumeric(22)}`,
        youtube_handle: `@${faker.internet.username()}`,
      }),
    ),
  )

  // Create YouTube videos (relations)
  const allVideos = await videos.findMany()

  // Create specific test data that tests expect
  const testYoutubeVideoIds = ['YT_video1abc', 'YT_video2def', 'YT_video3ghi']
  await Promise.all(
    allVideos.slice(0, 3).map((video, idx) => {
      const channel = createdChannels[idx % createdChannels.length]
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
    allVideos.slice(3).map((video, idx) => {
      const channel = createdChannels[(idx + 3) % createdChannels.length]
      if (!channel) return Promise.resolve()

      return youtubeVideos.create({
        id: faker.string.uuid(),
        video_id: video.id,
        youtube_channel_id: channel.id,
        youtube_video_id: faker.string.alphanumeric(11),
      })
    }),
  )

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

  await Promise.all(
    termsList.map((termData) =>
      terms.create({
        created_at: faker.date.past({ years: 1 }).toISOString(),
        id: faker.string.uuid(),
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
    message: 'メンテナンスのお知らせ',
    start_at: faker.date.recent().toISOString(),
    updated_at: faker.date.recent().toISOString(),
  })
}
