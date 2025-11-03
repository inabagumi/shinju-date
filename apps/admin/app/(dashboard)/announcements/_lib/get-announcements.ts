import { createSupabaseServerClient } from '@/lib/supabase'
import type { Announcement } from './types'

export default async function getAnnouncements(): Promise<Announcement[]> {
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
