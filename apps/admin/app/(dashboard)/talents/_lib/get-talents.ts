import type { Tables } from '@shinju-date/database'
import { createSupabaseServerClient } from '@/lib/supabase'

export type TalentListItem = Pick<
  Tables<'talents'>,
  'id' | 'name' | 'created_at' | 'updated_at' | 'deleted_at' | 'status'
> & {
  youtube_channels: Pick<
    Tables<'youtube_channels'>,
    'id' | 'name' | 'youtube_channel_id' | 'youtube_handle'
  >[]
}

export async function getTalents(): Promise<TalentListItem[]> {
  const supabaseClient = await createSupabaseServerClient()

  // Admin can read deleted talents via RLS; include all for filter UI
  const { data: talents, error } = await supabaseClient
    .from('talents')
    .select(
      'id, name, created_at, updated_at, deleted_at, status, youtube_channels(id, name, youtube_channel_id, youtube_handle)',
    )
    .order('name', {
      ascending: true,
    })

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return talents
}
