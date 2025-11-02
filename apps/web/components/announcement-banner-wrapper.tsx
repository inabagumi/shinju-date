import { Suspense } from 'react'
import { getAnnouncement } from '@/lib/get-announcement'
import { AnnouncementBanner } from './announcement-banner'

async function AnnouncementContent() {
  const announcement = await getAnnouncement()

  if (!announcement) {
    return null
  }

  return (
    <AnnouncementBanner
      level={announcement.level}
      message={announcement.message}
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
