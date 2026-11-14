import { PageHeader } from '@shinju-date/ui'
import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import { Suspense } from 'react'
import { ListCardsSkeleton } from '@/components/skeletons'
import { AnnouncementModal } from './_components/announcement-modal'
import { AnnouncementsList } from './_components/announcements-list'
import getAnnouncements from './_lib/get-announcements'

export const metadata: Metadata = {
  title: 'お知らせ管理',
}

async function AnnouncementsListData() {
  'use cache: private'

  cacheLife('minutes')

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
              <div className="h-10 w-32 animate-pulse rounded bg-gray-200" />
            }
          >
            <AnnouncementModal />
          </Suspense>
        }
        title="お知らせ管理"
      />

      {/* Announcements List - dynamic data with own Suspense */}
      <Suspense fallback={<ListCardsSkeleton />}>
        <AnnouncementsListData />
      </Suspense>
    </div>
  )
}
