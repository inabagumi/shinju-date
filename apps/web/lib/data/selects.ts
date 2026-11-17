/**
 * The fragments of the selects of the videos, and the selects of each use
 * made from them.
 *
 * They are string literals (`as const` where they are built from others), so
 * Supabase infers the types of the rows from them. Pass them to `.select()`
 * without a type argument, and derive the types of the rows from the queries
 * with `QueryData`.
 */

const PROFILE_IMAGE_COLUMNS = 'profile_image:profile_images (blur_data_url, id)'

/** The columns of a video itself */
export const VIDEO_BASE_COLUMNS =
  'duration, id, platform, published_at, status, title, video_kind'

/**
 * The talent of a video. It is joined inner, so a video of a talent that is
 * hidden (deleted) is left out.
 */
export const VIDEO_TALENT_COLUMNS = 'talent:talents!inner (id, name)'

/** `VIDEO_TALENT_COLUMNS` with the theme color of the talent */
export const VIDEO_TALENT_WITH_THEME_COLOR_COLUMNS =
  'talent:talents!inner (id, name, theme_color)'

/** The thumbnail of a video, `null` when it has none */
export const VIDEO_THUMBNAIL_COLUMNS =
  'thumbnail:thumbnails (blur_data_url, height, id, path, width)'

const YOUTUBE_VIDEO_COLUMNS = `
  youtube_video_id,
  youtube_channel:youtube_channels (
    name,
    youtube_handle,
    ${PROFILE_IMAGE_COLUMNS}
  )
` as const

const TWITCH_VIDEO_COLUMNS = `
  twitch_video_id,
  type,
  twitch_user:twitch_users (
    name,
    twitch_login_name,
    ${PROFILE_IMAGE_COLUMNS}
  )
` as const

/**
 * The YouTube and Twitch videos of a video, with the channel or user that
 * published it, to link to the video and show who published it. The one of
 * the other platform is `null`.
 */
export const VIDEO_PLATFORM_COLUMNS = `
  youtube_video:youtube_videos (${YOUTUBE_VIDEO_COLUMNS}),
  twitch_video:twitch_videos (${TWITCH_VIDEO_COLUMNS})
` as const

const YOUTUBE_VIDEO_ID_COLUMNS = 'youtube_video_id'

const TWITCH_VIDEO_ID_COLUMNS = `
  twitch_video_id,
  type,
  twitch_user:twitch_users (twitch_login_name)
` as const

/**
 * The YouTube and Twitch videos of a video with only what links to the video
 * (`getVideoExternalUrl`). The one of the other platform is `null`.
 */
export const VIDEO_PLATFORM_ID_COLUMNS = `
  youtube_video:youtube_videos (${YOUTUBE_VIDEO_ID_COLUMNS}),
  twitch_video:twitch_videos (${TWITCH_VIDEO_ID_COLUMNS})
` as const

/** The videos of the video cards (the home page and the search results) */
export const VIDEO_LIST_SELECT = `
  ${VIDEO_BASE_COLUMNS},
  ${VIDEO_TALENT_COLUMNS},
  ${VIDEO_THUMBNAIL_COLUMNS},
  ${VIDEO_PLATFORM_COLUMNS}
` as const

/**
 * The videos of the schedule: the videos of the video cards without the
 * thumbnail, with the theme color of the talent.
 */
export const VIDEO_SCHEDULE_SELECT = `
  ${VIDEO_BASE_COLUMNS},
  ${VIDEO_TALENT_WITH_THEME_COLOR_COLUMNS},
  ${VIDEO_PLATFORM_COLUMNS}
` as const

/** The videos of the calendars (`/videos.ics` and `/talents/[id].ics`) */
export const VIDEO_CALENDAR_SELECT = `
  ${VIDEO_BASE_COLUMNS},
  ${VIDEO_TALENT_COLUMNS},
  ${VIDEO_PLATFORM_ID_COLUMNS}
` as const

/** The video a click is tracked for (`/api/ping`) */
export const VIDEO_CLICK_SELECT = `
  ${VIDEO_BASE_COLUMNS},
  ${VIDEO_TALENT_COLUMNS},
  ${VIDEO_PLATFORM_ID_COLUMNS}
` as const

/**
 * `VIDEO_CLICK_SELECT` with the YouTube video joined inner, so filtering by
 * the ID of the YouTube video leaves out the other videos.
 */
export const VIDEO_CLICK_SELECT_BY_YOUTUBE_VIDEO = `
  ${VIDEO_BASE_COLUMNS},
  ${VIDEO_TALENT_COLUMNS},
  youtube_video:youtube_videos!inner (${YOUTUBE_VIDEO_ID_COLUMNS}),
  twitch_video:twitch_videos (${TWITCH_VIDEO_ID_COLUMNS})
` as const

/**
 * `VIDEO_CLICK_SELECT` with the Twitch video joined inner, so filtering by the
 * ID of the Twitch video leaves out the other videos.
 */
export const VIDEO_CLICK_SELECT_BY_TWITCH_VIDEO = `
  ${VIDEO_BASE_COLUMNS},
  ${VIDEO_TALENT_COLUMNS},
  youtube_video:youtube_videos (${YOUTUBE_VIDEO_ID_COLUMNS}),
  twitch_video:twitch_videos!inner (${TWITCH_VIDEO_ID_COLUMNS})
` as const
