import type { QueryData } from '@supabase/supabase-js'
import { cacheLife } from 'next/cache'
import {
  createSupabaseServerClient,
  type TypedSupabaseClient,
} from '@/lib/supabase'
import { unwrap } from '@/lib/supabase/query'

const RECENT_VIDEO_SELECT = `
  id,
  title,
  published_at,
  visible,
  deleted_at,
  status,
  thumbnail:thumbnails (id, path, blur_data_url),
  youtube_video:youtube_videos (youtube_video_id)
`

function selectRecentVideos(
  supabaseClient: TypedSupabaseClient,
  talentId: string,
  limit: number,
) {
  return supabaseClient
    .from('videos')
    .select(RECENT_VIDEO_SELECT)
    .is('deleted_at', null)
    .is('visible', true)
    .eq('talent_id', talentId)
    .order('published_at', { ascending: false })
    .limit(limit)
}

export type RecentVideo = QueryData<
  ReturnType<typeof selectRecentVideos>
>[number]

export async function getRecentVideosForTalent(
  talentId: string,
  limit = 5,
): Promise<RecentVideo[]> {
  'use cache: private'

  cacheLife('minutes')

  const supabaseClient = await createSupabaseServerClient()

  return unwrap(
    await selectRecentVideos(supabaseClient, talentId, limit),
    'getRecentVideosForTalent',
  )
}
