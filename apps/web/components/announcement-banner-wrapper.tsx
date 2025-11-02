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
