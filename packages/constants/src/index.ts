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
} as const
