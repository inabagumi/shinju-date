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
    video_kind: z.enum(['standard', 'short']),
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
 *
 * Note: @msw/data v1.1.2's relation system requires relations to be defined
 * in the schema itself using getters. However, we're using a manual approach
 * here by storing relation data in the primary key field during seeding.
 *
 * The automatic relation resolution through schema is not used in this implementation
 * because it would require restructuring all our Zod schemas to include getter-based
 * relation properties, which would be a breaking change.
 *
 * Instead, we handle relations manually in the applySelect function by looking up
 * related records when needed (e.g., item.talent_id -> talents.findFirst()).
 */
export function defineCollectionRelations() {
  // Relations are handled manually in applySelect function
  // See handlers/supabase.ts for implementation details
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
  const themeColors = ['#FF6B9D', '#87CEEB', '#98D8C8', '#FFB6C1']
  const createdTalents = await Promise.all(
    talentNames.map((name, idx) =>
      talents.create({
        created_at: faker.date.past({ years: 2 }).toISOString(),
        deleted_at: null,
        id: faker.string.uuid(),
        name,
        theme_color: themeColors[idx] ?? null,
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

      // Make some videos shorts (30% chance) using weightedArrayElement for clarity
      const videoKind = faker.helpers.weightedArrayElement([
        { value: 'short', weight: 0.3 },
        { value: 'standard', weight: 0.7 },
      ])

      return videos.create({
        created_at: faker.date.past({ years: 1 }).toISOString(),
        deleted_at: null,
        duration:
          videoKind === 'short'
            ? `PT${faker.number.int({ max: 60, min: 15 })}S` // Shorts are 15-60 seconds
            : `PT${faker.number.int({ max: 3, min: 1 })}H${faker.number.int({ max: 59, min: 0 })}M${faker.number.int({ max: 59, min: 0 })}S`,
        id: faker.string.uuid(),
        platform: 'YOUTUBE',
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
        duration: `PT${faker.number.int({ max: 60, min: 15 })}S`,
        id: faker.string.uuid(),
        platform: 'YOUTUBE',
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
