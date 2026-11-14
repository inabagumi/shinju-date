import { cacheLife } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase'

/**
 * Counts the accounts whose latest backfill job failed. Accounts that were
 * deleted, or whose talent was deleted, are left out by the view.
 */
export async function countVideoBackfillFailures(): Promise<number> {
  'use cache: private'

  cacheLife('minutes')

  const supabaseClient = await createSupabaseServerClient()
  const { count, error } = await supabaseClient
    .from('video_backfill_latest_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'failed')

  if (error) {
    throw error
  }

  return count ?? 0
}
