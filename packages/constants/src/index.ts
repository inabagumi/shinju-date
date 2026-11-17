export const TIME_ZONE = 'Asia/Tokyo'

// Cache tags of the public site (web). admin and batch revalidate them
export const CACHE_TAGS = {
  ANNOUNCEMENTS: 'announcements',
  RECOMMENDATION_QUERIES: 'recommendation-queries',
  TALENTS: 'talents',
  VIDEOS: 'videos',
} as const

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS]

// Every Redis key of the apps and packages: the fixed keys, and the prefixes
// (`*_PREFIX`) that a date or an ID is appended to. Do not write a key in the
// code directly. Every key gets an expiry, except the ones marked
// `期限なし` with the reason
export const REDIS_KEYS = {
  CLICK_CHANNEL_PREFIX: 'channels:clicked:',
  CLICK_VIDEO_PREFIX: 'videos:clicked:',
  LAST_VIDEO_SYNC: 'status:last_video_sync',
  // 期限なし: メンテナンスモードの状態。管理者が解除するまで続く
  MAINTENANCE_MODE: 'maintenance_mode',
  // Union of the daily rankings over a date range, cached by admin
  // (format: prefix + `<ranking prefix without trailing colon>:<YYYYMMDD>/<YYYYMMDD>`)
  POPULAR_ITEMS_CACHE_PREFIX: 'cache:popular_items:',
  QUERIES_AUTO_RECOMMENDED: 'queries:auto_recommended',
  // 期限なし: 管理者が登録した、おすすめの検索語。管理者が削除するまで残す
  QUERIES_MANUAL_RECOMMENDED: 'queries:manual_recommended',
  // Runs of the batch cron jobs, counted per fixed window
  // (format: prefix + `<job identifier>:<window number>`)
  RATELIMIT_CRON_PREFIX: 'ratelimit:cron:',
  SEARCH_EXIT_WITHOUT_CLICK_PREFIX: 'search:exit_without_click:',
  // 期限なし: 全期間の検索回数の集計。期限を付けると、それまでの集計が消える
  SEARCH_POPULAR_ALL_TIME: 'search:popular:all_time',
  SEARCH_POPULAR_DAILY_PREFIX: 'search:popular:daily:',
  SEARCH_POPULAR_TEMP_UNION: 'search:popular:temp_union',
  SEARCH_POPULAR_WEEKLY_PREFIX: 'search:popular:weekly:',
  SEARCH_SESSIONS_PREFIX: 'search:sessions:',
  SEARCH_VOLUME_PREFIX: 'search:volume:',
  // 期限なし: 全期間の、結果が0件だった検索語の集計。期限を付けると、
  // それまでの集計が消える
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

export {
  isLiveTwitchVideoId,
  LIVE_TWITCH_VIDEO_ID_PREFIX,
  streamIdFromLiveTwitchVideoId,
  toLiveTwitchVideoId,
} from './twitch-live-id.js'
