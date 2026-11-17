import type { Tables } from '@shinju-date/database'
import { cacheLife } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase'
import { unwrap } from '@/lib/supabase/query'

export default async function getAnnouncements(): Promise<
  Tables<'announcements'>[]
> {
  'use cache: private'

  cacheLife('minutes')

  const supabase = await createSupabaseServerClient()

  return (
    unwrap(
      await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false }),
      'getAnnouncements',
    ) ?? []
  )
}
