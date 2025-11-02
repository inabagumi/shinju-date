import { Temporal } from 'temporal-polyfill'
import { supabaseClient } from './supabase'

export type Announcement = {
  id: string
  message: string
  level: string
  start_at: string
  end_at: string
}

/**
 * Get the currently active announcement
 * Returns null if no announcement is active
 */
export async function getAnnouncement(): Promise<Announcement | null> {
  const now = Temporal.Now.instant().toString()

  const { data, error } = await supabaseClient
    .from('announcements')
    .select('id, message, level, start_at, end_at')
    .eq('enabled', true)
    .lte('start_at', now)
    .gte('end_at', now)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    // No active announcement found (or other error)
    return null
  }

  return data
}
