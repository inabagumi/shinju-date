import type { Tables } from '@shinju-date/database'
import { supabaseClient } from '@/lib/supabase/admin'

export interface FeedbackFilters {
  status?: Tables<'feedback'>['status']
  isRead?: boolean
}

export async function getFeedback(
  filters: FeedbackFilters = {},
): Promise<Tables<'feedback'>[]> {
  let query = supabaseClient
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.isRead !== undefined) {
    query = query.eq('is_read', filters.isRead)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data || []
}

export async function getFeedbackById(
  id: string,
): Promise<Tables<'feedback'> | null> {
  const { data, error } = await supabaseClient
    .from('feedback')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw error
  }

  return data
}
