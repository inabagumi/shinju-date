'use server'

import { COOKIE_NAMES } from '@shinju-date/constants'
import type { Tables } from '@shinju-date/database'
import { logger } from '@shinju-date/logger'
import { toDBString } from '@shinju-date/temporal-fns'
import { track } from '@vercel/analytics/server'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Temporal } from 'temporal-polyfill'
import { createServerComponentClient } from '@/lib/supabase-rsc'

const ONE_DAY_IN_SECONDS = 60 * 60 * 24

export type Announcement = Pick<
  Tables<'announcements'>,
  'end_at' | 'id' | 'level' | 'message' | 'start_at'
>

/**
 * Get the currently active announcement
 * Returns null if no announcement is active
 *
 * This version is for Server Components that have access to cookies.
 * For client components, use getAnnouncementFromClient instead.
 */
export async function getAnnouncement(
  cookieStore: ReadonlyRequestCookies,
): Promise<Announcement | null> {
  const now = Temporal.Now.instant()
  const supabaseClient = createServerComponentClient(cookieStore)

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
 * Get the currently active announcement from a client component
 * This version fetches cookies internally and is safe to call from client components
 */
export async function getAnnouncementFromClient(): Promise<Announcement | null> {
  const cookieStore = await cookies()
  return getAnnouncement(cookieStore)
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
