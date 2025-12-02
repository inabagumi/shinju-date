import type { Tables } from '@shinju-date/database'
import { supabaseClient } from '@/lib/supabase/admin'

export interface FeatureRequestFilters {
  status?: Tables<'feature_requests'>['status']
  isRead?: boolean
}

export async function getFeatureRequests(
  filters: FeatureRequestFilters = {},
): Promise<Tables<'feature_requests'>[]> {
  let query = supabaseClient
    .from('feature_requests')
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

export async function getFeatureRequestById(
  id: string,
): Promise<Tables<'feature_requests'> | null> {
  const { data, error } = await supabaseClient
    .from('feature_requests')
    .select('*')
    .eq('id', id)
    .single()

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

  return data
}
