import { createSupabaseServerClient } from '@/lib/supabase'

export type Announcement = {
  id: string
  message: string
  level: string
  enabled: boolean
  start_at: string
  end_at: string
  created_at: string | null
  updated_at: string | null
}

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
