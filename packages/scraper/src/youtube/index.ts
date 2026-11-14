export type { ProfileImageSyncResult } from '../internal/profile-images/index.js'
export type {
  AddPastVideosOptions,
  AddPastVideosResult,
  ErrorReporter,
  Logger,
  ScraperOptions,
  TypedSupabaseClient,
} from '../types.js'
export type {
  SavedProfileImageRow,
  SavedYouTubeChannelIcon,
  SyncYouTubeChannelIconOptions,
} from './profile-image.js'
export {
  selectYouTubeChannelIconUrl,
  syncYouTubeChannelIcon,
} from './profile-image.js'
export { YouTubeScraper } from './scraper.js'
export type { YouTubeScraperOptions } from './types.js'
