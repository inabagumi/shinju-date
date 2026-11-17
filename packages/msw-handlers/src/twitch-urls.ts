/** Host Twitch serves user icons (and its default icons) from. */
export const TWITCH_ICON_HOST = 'https://static-cdn.jtvnw.net'

/** Directory of the icons users upload themselves. */
export const TWITCH_USER_ICON_DIRECTORY = 'jtv_user_pictures'

/** Directory of the icons Twitch gives users without one of their own. */
export const TWITCH_DEFAULT_ICON_DIRECTORY = 'user-default-pictures-uv'

/** The URL of the icon Twitch gives users without one of their own. */
export const TWITCH_DEFAULT_ICON_URL = `${TWITCH_ICON_HOST}/${TWITCH_DEFAULT_ICON_DIRECTORY}/294c98b5-e34d-42cd-a8f0-140b72fba9b0-profile_image-300x300.png`

/**
 * The file name of the icon of a user, in
 * {@link TWITCH_USER_ICON_DIRECTORY}. The icon handler answers with it as
 * the ETag.
 */
export function getTwitchUserIconName(userId: string): string {
  return `mock-${userId}-profile_image-300x300.png`
}

/** The URL of the icon of a user (`profile_image_url`). */
export function getTwitchUserIconUrl(userId: string): string {
  return `${TWITCH_ICON_HOST}/${TWITCH_USER_ICON_DIRECTORY}/${getTwitchUserIconName(userId)}`
}
