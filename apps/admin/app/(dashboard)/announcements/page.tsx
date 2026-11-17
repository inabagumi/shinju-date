import { PageHeader } from '@shinju-date/ui'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AnnouncementModal } from './_components/announcement-modal'
import {
  AnnouncementsList,
  AnnouncementsListSkeleton,
} from './_components/announcements-list'
import getAnnouncements from './_lib/get-announcements'

export const metadata: Metadata = {
  title: 'お知らせ管理',
}

async function AnnouncementsListData() {
  const announcements = await getAnnouncements()

  return <AnnouncementsList announcements={announcements} />
}

export default function AnnouncementsPage() {
  return (
    <div>
      {/* Header with Add button - static shell */}
      <PageHeader
        actions={
          <Suspense
            fallback={
              <div className="h-10 w-48 animate-pulse rounded-control bg-muted" />
            }
          >
            <AnnouncementModal />
          </Suspense>
        }
        title="お知らせ管理"
      />

      {/* Announcements List - dynamic data with own Suspense */}
      <Suspense fallback={<AnnouncementsListSkeleton />}>
        <AnnouncementsListData />
      </Suspense>
    </div>
  )
}
