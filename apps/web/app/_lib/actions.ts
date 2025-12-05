'use server'

import { COOKIE_NAMES } from '@shinju-date/constants'
import type { Tables } from '@shinju-date/database'
import { logger } from '@shinju-date/logger'
import { toDBString } from '@shinju-date/temporal-fns'
import { track } from '@vercel/analytics/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Temporal } from 'temporal-polyfill'
import { supabaseClient } from '@/lib/supabase'

const ONE_DAY_IN_SECONDS = 60 * 60 * 24

export type Announcement = Pick<
  Tables<'announcements'>,
  'end_at' | 'id' | 'level' | 'message' | 'start_at'
>

/**
 * Get the currently active announcement
 * Returns null if no announcement is active
 */
export async function getAnnouncement(): Promise<Announcement | null> {
  const now = Temporal.Now.instant()

  const { data, error } = await supabaseClient
    .from('announcements')
    .select('id, message, level, start_at, end_at')
    .eq('enabled', true)
    .lte('start_at', toDBString(now))
    .gte('end_at', toDBString(now))
    .order('created_at', { ascending: false })
    .maybeSingle()

  if (error) {
    logger.error('Failed to fetch announcement', { error })

    return null
  }

  return data
}

/**
 * Server action to dismiss an announcement by saving its ID to a cookie
 * This prevents the announcement from being shown again until the cookie expires
 */
export async function dismissAnnouncement(announcementId: string) {
  const cookieStore = await cookies()

  cookieStore.set(COOKIE_NAMES.DISMISSED_ANNOUNCEMENT_ID, announcementId, {
    httpOnly: true,
    maxAge: ONE_DAY_IN_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function search(formData: FormData) {
  const query = formData.get('query')

  if (query && typeof query === 'string') {
    await track('Search', {
      query,
    })

    redirect(`/videos/${encodeURIComponent(query)}`)
  } else {
    redirect('/videos')
  }
}

export type Suggestion = {
  term: string
}

/**
 * Fetch search suggestions based on a query
 * Returns an array of suggested search terms
 */
export async function fetchSuggestions(query: string): Promise<Suggestion[]> {
  if (!query || query.trim().length === 0) {
    return []
  }

  try {
    const { data, error } = await supabaseClient.rpc('suggestions_v2', {
      p_query: query.trim(),
    })

    if (error) {
      logger.error('Failed to fetch suggestions', { error, query })
      return []
    }

    return data || []
  } catch (err) {
    logger.error('Failed to fetch suggestions', { error: err, query })
    return []
  }
}
