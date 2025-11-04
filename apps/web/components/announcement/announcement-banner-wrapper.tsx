import { COOKIE_NAMES } from '@shinju-date/constants'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { getAnnouncement } from '@/lib/announcement/get-announcement'
import { AnnouncementBanner } from './announcement-banner'

async function AnnouncementContent() {
  const announcement = await getAnnouncement()

  if (!announcement) {
    return null
  }

  // Check if the user has dismissed this announcement
  const cookieStore = await cookies()
  const dismissedId = cookieStore.get(
    COOKIE_NAMES.DISMISSED_ANNOUNCEMENT_ID,
  )?.value

  // Don't show the banner if the user has dismissed this specific announcement
  if (dismissedId === announcement.id) {
    return null
  }

  return (
    <AnnouncementBanner
      endAt={announcement.end_at}
      initialId={announcement.id}
      level={announcement.level}
      message={announcement.message}
      startAt={announcement.start_at}
    />
  )
}

export function AnnouncementBannerWrapper() {
  return (
    <Suspense fallback={null}>
      <AnnouncementContent />
    </Suspense>
  )
}
