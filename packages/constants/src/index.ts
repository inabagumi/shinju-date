export const TIME_ZONE = 'Asia/Tokyo'

// Cookie names
export const COOKIE_NAMES = {
  DISMISSED_ANNOUNCEMENT_ID: 'dismissed_announcement_id',
} as const

// Redis keys for search analytics
export const REDIS_KEYS = {
  CLICK_CHANNEL_PREFIX: 'channels:clicked:',
  CLICK_VIDEO_PREFIX: 'videos:clicked:',
  LAST_VIDEO_SYNC: 'status:last_video_sync',
  MAINTENANCE_MODE: 'maintenance_mode',
  POPULAR_VIDEOS_PREFIX: 'videos:popular:cache:',
  QUERIES_AUTO_RECOMMENDED: 'queries:auto_recommended',
  QUERIES_COMBINED_CACHE: 'queries:combined_cache',
  QUERIES_MANUAL_RECOMMENDED: 'queries:manual_recommended',
  RECOMMENDATION_QUERIES: 'recommendation_queries',
  SEARCH_EXIT_WITHOUT_CLICK_PREFIX: 'search:exit_without_click:',
  SEARCH_POPULAR: 'search:popular',
  SEARCH_POPULAR_ALL_TIME: 'search:popular:all_time',
  SEARCH_POPULAR_DAILY_PREFIX: 'search:popular:daily:',
  SEARCH_POPULAR_TEMP_UNION: 'search:popular:temp_union',
  SEARCH_POPULAR_WEEKLY_PREFIX: 'search:popular:weekly:',
  SEARCH_SESSIONS_PREFIX: 'search:sessions:',
  SEARCH_VOLUME_PREFIX: 'search:volume:',
  SEARCH_ZERO_RESULTS: 'search:zero_results',
  // New keys for enhanced search analytics
  SESSIONS_TOTAL_PREFIX: 'sessions:total:',
  SESSIONS_WITH_SEARCH_PREFIX: 'sessions:with_search:',
  // Dashboard summary trend snapshots (format: prefix + YYYYMMDD)
  SUMMARY_ANALYTICS_PREFIX: 'summary:analytics:',
  SUMMARY_STATS_PREFIX: 'summary:stats:',
  // Backfill of past videos: admin enqueues jobs, batch `/videos/backfill`
  // works them off (format: prefix + `<provider>:<account row ID>`)
  VIDEO_BACKFILL_JOB_PREFIX: 'jobs:video-backfill:job:',
  VIDEO_BACKFILL_LOCK_PREFIX: 'jobs:video-backfill:lock:',
  VIDEO_BACKFILL_QUEUE: 'jobs:video-backfill:queue',
  // Check of the accounts of all active talents: the latest check, the lock
  // held while one is being requested, and the outcomes of its jobs
  // (format: prefix + `<check ID>:<job ID>`)
  VIDEO_BACKFILL_RUN: 'jobs:video-backfill:run',
  VIDEO_BACKFILL_RUN_LOCK: 'jobs:video-backfill:run-lock',
  VIDEO_BACKFILL_RUN_RESULT_PREFIX: 'jobs:video-backfill:run-result:',
} as const

export const SITE_NAME = 'SHINJU DATE'

export const SITE_DESCRIPTION = `「${SITE_NAME}」はななしいんくに所属するタレントがYouTubeで配信や投稿した動画を検索できるウェブサービスです。ななしいんくに定める二次創作ガイドラインに従ってななしいんくにとは直接の関係がない営利を目的としていない団体であるHaneru Developersによって開発と運営が行われています。`
export const SITE_TAGLINE =
  'ななしいんく所属タレントの配信スケジュールや動画の検索ができるウェブサービス'
export const SITE_THEME_COLOR = '#1e0064' // var(--color-primary)

export const SEARCH_RESULT_COUNT = 6

/** タイトルの【】の中で、出演者の表記を見分けるための所属の名前 */
export const TALENT_AFFILIATION_NAME = 'ななしいんく'

/**
 * 1x1 transparent PNG image (89 bytes)
 * Used as fallback when thumbnail fetch fails
 */
export const DUMMY_THUMBNAIL_PNG = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0,
  0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120,
  218, 99, 100, 96, 248, 95, 15, 0, 2, 135, 1, 128, 235, 71, 186, 146, 0, 0, 0,
  0, 73, 69, 78, 68, 174, 66, 96, 130,
])

/**
 * Prefix for synthetic `twitch_videos.twitch_video_id` values while a stream is
 * live (or recently ended) and the archive VOD id is not yet known.
 * Helix video IDs are numeric; this prefix avoids collisions.
 */
export const LIVE_TWITCH_VIDEO_ID_PREFIX = 'live:' as const

/**
 * Builds a stable synthetic platform id for a live (or pending-archive) stream.
 */
export function toLiveTwitchVideoId(streamId: string): string {
  return `${LIVE_TWITCH_VIDEO_ID_PREFIX}${streamId}`
}

/**
 * Returns true when `twitch_video_id` is a synthetic live placeholder.
 */
export function isLiveTwitchVideoId(twitchVideoId: string): boolean {
  return twitchVideoId.startsWith(LIVE_TWITCH_VIDEO_ID_PREFIX)
}

/**
 * Extracts the Helix stream id from a synthetic live video id, or null.
 */
export function streamIdFromLiveTwitchVideoId(
  twitchVideoId: string,
): string | null {
  if (!isLiveTwitchVideoId(twitchVideoId)) {
    return null
  }
  return twitchVideoId.slice(LIVE_TWITCH_VIDEO_ID_PREFIX.length)
}
