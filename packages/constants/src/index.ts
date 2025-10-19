export const TIME_ZONE = 'Asia/Tokyo'

// Redis keys for search analytics
export const REDIS_KEYS = {
  CLICK_CHANNEL_PREFIX: 'channels:clicked:',
  CLICK_VIDEO_PREFIX: 'videos:clicked:',
  POPULAR_VIDEOS_PREFIX: 'videos:popular:cache:',
  RECOMMENDATION_QUERIES: 'recommendation_queries',
  SEARCH_POPULAR: 'search:popular',
  SEARCH_VOLUME_PREFIX: 'search:volume:',
  SEARCH_ZERO_RESULTS: 'search:zero_results',
} as const
