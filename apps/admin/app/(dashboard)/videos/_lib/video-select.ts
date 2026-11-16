/**
 * 動画の一覧と詳細で共通の列。タレント、プラットフォームの ID、サムネイルを
 * 埋め込む。詳細は、これに列を足して使う。
 */
export const VIDEO_SELECT = `
  id,
  title,
  visible,
  deleted_at,
  published_at,
  updated_at,
  status,
  duration,
  platform,
  video_kind,
  thumbnail:thumbnails (id, path, blur_data_url),
  talent:talents (id, name),
  youtube_video:youtube_videos (youtube_video_id),
  twitch_video:twitch_videos (
    twitch_video_id,
    type,
    twitch_user:twitch_users (twitch_login_name)
  )
`
