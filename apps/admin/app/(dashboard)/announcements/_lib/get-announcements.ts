import type { Tables } from '@shinju-date/database'
import { createSupabaseServerClient } from '@/lib/supabase'

export default async function getAnnouncements(): Promise<
  Tables<'announcements'>[]
> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data || []
}
