'use server'

import { COOKIE_NAMES } from '@shinju-date/constants'
import type { Tables } from '@shinju-date/database'
import { logger } from '@shinju-date/logger'
import { toDBString } from '@shinju-date/temporal-fns'
import { track } from '@vercel/analytics/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { fetchActiveTalents, type Talent } from '@/lib/fetchers'
import { getDisplayRecommendationQueries } from '@/lib/recommendations/get-display-queries'
import { supabaseClient } from '@/lib/supabase'
import { getVideosPath } from '@/lib/video-kind-filter'
import {
  type RenderedAnnouncement,
  renderAnnouncement,
} from '../_components/announcement-message'

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
 * Get the currently active announcement with its message rendered on the
 * server, so that the banner can refresh it without the Markdown parser
 * being shipped to the browser.
 * Returns null if no announcement is active
 */
export async function getRenderedAnnouncement(): Promise<RenderedAnnouncement | null> {
  const announcement = await getAnnouncement()

  return announcement ? renderAnnouncement(announcement) : null
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
  const value = formData.get('query')
  const query = typeof value === 'string' ? value : ''

  if (query) {
    await track('Search', {
      query,
    })
  }

  redirect(getVideosPath(query, 'all'))
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

/**
 * Fetch recommended queries for display
 * Returns an array of recommended search query strings
 */
export async function fetchRecommendedQueries(): Promise<string[]> {
  try {
    return await getDisplayRecommendationQueries()
  } catch (err) {
    logger.error('Failed to fetch recommended queries', { error: err })
    return []
  }
}

/**
 * Fetch the active talents (ID and name) for the search modal.
 * The modal matches them against the input in the browser.
 */
export async function fetchSearchModalTalents(): Promise<Talent[]> {
  try {
    return await fetchActiveTalents()
  } catch (err) {
    logger.error('Failed to fetch talents', { error: err })
    return []
  }
}
