import type { QueryData } from '@supabase/supabase-js'
import { cacheLife } from 'next/cache'
import {
  createSupabaseServerClient,
  type TypedSupabaseClient,
} from '@/lib/supabase'

const TALENT_SELECT = `
  id,
  name,
  reading,
  theme_color,
  status,
  created_at,
  updated_at,
  deleted_at,
  youtube_channels (id, name, youtube_channel_id, youtube_handle),
  twitch_users (id, name, twitch_user_id, twitch_login_name)
`

function selectTalent(supabaseClient: TypedSupabaseClient, id: string) {
  return supabaseClient
    .from('talents')
    .select(TALENT_SELECT)
    .eq('id', id)
    .single()
}

export type Talent = QueryData<ReturnType<typeof selectTalent>>

export async function getTalent(id: string): Promise<Talent | null> {
  'use cache: private'

  cacheLife('minutes')

  const supabaseClient = await createSupabaseServerClient()

  const { data: talent, error } = await selectTalent(supabaseClient, id)

  if (error) {
    if (error.code === 'PGRST116') {
      // Row not found
      return null
    }
    // Check for invalid UUID format error
    if (
      error.message?.includes('invalid input syntax for type uuid') ||
      error.code === '22P02'
    ) {
      // Invalid UUID format - treat as not found
      return null
    }
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return talent
}
