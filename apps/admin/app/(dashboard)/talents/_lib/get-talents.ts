import type { QueryData } from '@supabase/supabase-js'
import { cacheLife } from 'next/cache'
import {
  createSupabaseServerClient,
  type TypedSupabaseClient,
} from '@/lib/supabase'
import { unwrap } from '@/lib/supabase/query'

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
  'use cache: private'

  cacheLife('minutes')

  const supabaseClient = await createSupabaseServerClient()

  // Admin can read deleted talents via RLS; include all for filter UI
  return unwrap(await selectTalents(supabaseClient), 'getTalents')
}
