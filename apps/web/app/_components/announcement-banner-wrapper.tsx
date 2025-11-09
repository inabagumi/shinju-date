import { COOKIE_NAMES } from '@shinju-date/constants'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { getAnnouncement } from '../_lib/actions'
import { AnnouncementBanner } from './announcement-banner'

async function AnnouncementContent() {
  const cookieStore = await cookies()
  const announcement = await getAnnouncement()

  if (!announcement) {
    return null
  }

  const dismissedId = cookieStore.get(
    COOKIE_NAMES.DISMISSED_ANNOUNCEMENT_ID,
  )?.value

  // Don't show the banner if the user has dismissed this specific announcement
  if (dismissedId === announcement.id) {
    return null
  }

  return <AnnouncementBanner announcement={announcement} />
}

export function AnnouncementBannerWrapper() {
  return (
    <Suspense fallback={null}>
      <AnnouncementContent />
    </Suspense>
  )
}
