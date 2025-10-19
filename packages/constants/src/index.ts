export const TIME_ZONE = 'Asia/Tokyo'

// Redis keys for search analytics
export const REDIS_KEYS = {
  SEARCH_POPULAR: 'search:popular',
  SEARCH_VOLUME_PREFIX: 'search:volume:',
  SEARCH_ZERO_RESULTS: 'search:zero_results',
} as const
