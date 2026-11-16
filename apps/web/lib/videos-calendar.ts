import { TIME_ZONE } from '@shinju-date/constants'
import { createErrorResponse } from '@shinju-date/helpers'
import { startOfHour } from '@shinju-date/temporal-fns'
import { createCalendarResponse, createEventAttributesList } from './calendar'
import { supabaseClient } from './supabase'
import type { VideoKindFilter } from './video-kind-filter'

interface CreateVideosCalendarResponseOptions {
  /** 動画の種別。`all` では絞り込まない */
  kind?: VideoKindFilter | undefined
  /** タレントの ID。空のときは絞り込まない */
  talentIds?: readonly string[] | undefined
}

/**
 * 1週間先までの動画を新しい順に 100 件まで取得し、カレンダーとして返す。
 * `/videos.ics` とタレント別のカレンダーで共有する。
 */
export async function createVideosCalendarResponse({
  kind = 'all',
  talentIds = [],
}: CreateVideosCalendarResponseOptions = {}): Promise<Response> {
  const now = startOfHour(Temporal.Now.zonedDateTimeISO(TIME_ZONE))
  let query = supabaseClient
    .from('videos')
    .select(
      `
        talent:talents!inner (
          name
        ),
        duration,
        id,
        platform,
        published_at,
        status,
        title,
        youtube_video:youtube_videos (youtube_video_id),
        twitch_video:twitch_videos (
          twitch_video_id,
          type,
          twitch_user:twitch_users (twitch_login_name)
        )
      `,
    )
    .lt(
      'published_at',
      now
        .add({
          days: 7,
        })
        .toInstant()
        .toString(),
    )

  if (talentIds.length > 0) {
    query = query.in('talent_id', [...talentIds])
  }

  if (kind !== 'all') {
    query = query.eq('video_kind', kind)
  }

  // The calendar also has the past videos, so there is no lower bound. They are
  // sorted from the latest, so the oldest ones are dropped at the limit.
  const { data: videos, error } = await query
    .order('published_at', {
      ascending: false,
    })
    .limit(100)

  if (error) {
    return createErrorResponse(error.message, {
      status: 500,
    })
  }

  const events = createEventAttributesList(videos, {
    now,
  })

  return createCalendarResponse(events)
}
