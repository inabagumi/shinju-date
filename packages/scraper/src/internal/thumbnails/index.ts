export type { RemoveUnusedThumbnailsOptions } from './cleanup.js'
export {
  removeUnusedThumbnails,
  UNUSED_THUMBNAIL_GRACE_PERIOD,
  UNUSED_THUMBNAIL_REMOVAL_LIMIT,
} from './cleanup.js'
export type { ReplaceThumbnailOptions } from './replace.js'
export { replaceThumbnail } from './replace.js'
export {
  DEFAULT_THUMBNAIL_HEIGHT,
  DEFAULT_THUMBNAIL_WIDTH,
  resolveThumbnailTemplateUrl,
} from './template-url.js'
export type {
  CreateThumbnailOptions,
  Thumbnail,
  ThumbnailRemovalContext,
  ThumbnailSource,
} from './thumbnail.js'
export { createThumbnail, removeThumbnail } from './thumbnail.js'
