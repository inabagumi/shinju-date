/**
 * Whether a video has a YouTube or Twitch video to link to. The site leaves
 * out the videos without either.
 */
export function hasPlatformSource(video: {
  twitch_video: object | null
  youtube_video: object | null
}): boolean {
  return video.youtube_video != null || video.twitch_video != null
}
