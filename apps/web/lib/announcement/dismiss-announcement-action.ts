'use server'

import { COOKIE_NAMES } from '@shinju-date/constants'
import { cookies } from 'next/headers'

const ONE_DAY_IN_SECONDS = 86400

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
