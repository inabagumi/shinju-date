/** Host the YouTube Data API serves channel icons from. */
export const YOUTUBE_ICON_HOST = "https://yt3.ggpht.com";

/**
 * The file name of the icon of a channel in a size, on
 * {@link YOUTUBE_ICON_HOST}. The icon handler answers with it as the ETag.
 */
export const getYouTubeChannelIconName = (
  channelId: string,
  size: number
): string => `mock-${channelId}=s${size}-c-k-c0x00ffffff-no-rj`;

/** The URL of the icon of a channel in a size. */
export const getYouTubeChannelIconUrl = (
  channelId: string,
  size: number
): string =>
  `${YOUTUBE_ICON_HOST}/${getYouTubeChannelIconName(channelId, size)}`;

/**
 * The ID of the playlist of the uploads of a channel. Like on YouTube, it is
 * the ID of the channel with `UU` in place of `UC`.
 */
export const getYouTubeUploadsPlaylistId = (channelId: string): string =>
  `UU${channelId.slice(2)}`;
