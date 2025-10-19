export const TIME_ZONE = 'Asia/Tokyo'

// Redis keys for search analytics
export const REDIS_KEYS = {
  CLICK_CHANNEL_PREFIX: 'channels:clicked:',
  CLICK_VIDEO_PREFIX: 'videos:clicked:',
  SEARCH_POPULAR: 'search:popular',
  SEARCH_VOLUME_PREFIX: 'search:volume:',
  SEARCH_ZERO_RESULTS: 'search:zero_results',
} as const
