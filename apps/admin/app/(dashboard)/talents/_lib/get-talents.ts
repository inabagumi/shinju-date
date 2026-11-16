import type { QueryData } from '@supabase/supabase-js'
import {
  createSupabaseServerClient,
  type TypedSupabaseClient,
} from '@/lib/supabase'

const TALENT_LIST_SELECT = `
  id,
  name,
  created_at,
  updated_at,
  deleted_at,
  status,
  youtube_channels (id, name, youtube_channel_id, youtube_handle)
`

function selectTalents(supabaseClient: TypedSupabaseClient) {
  return supabaseClient
    .from('talents')
    .select(TALENT_LIST_SELECT)
    .order('name', {
      ascending: true,
    })
}

export type TalentListItem = QueryData<ReturnType<typeof selectTalents>>[number]

export async function getTalents(): Promise<TalentListItem[]> {
  const supabaseClient = await createSupabaseServerClient()

  // Admin can read deleted talents via RLS; include all for filter UI
  const { data: talents, error } = await selectTalents(supabaseClient)

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return talents
}
