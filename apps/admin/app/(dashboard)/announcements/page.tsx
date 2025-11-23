import { cacheLife } from 'next/cache'
import { Suspense } from 'react'
import { AnnouncementModal } from './_components/announcement-modal'
import { AnnouncementsList } from './_components/announcements-list'
import getAnnouncements from './_lib/get-announcements'

async function AnnouncementsListData() {
  'use cache: private'
  cacheLife('minutes')

  const announcements = await getAnnouncements()

  return <AnnouncementsList announcements={announcements} />
}

export default function AnnouncementsPage() {
  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Header with Add button - static shell */}
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-3xl">お知らせ管理</h1>
          <Suspense
            fallback={
              <div className="h-10 w-32 animate-pulse rounded bg-gray-200" />
            }
          >
            <AnnouncementModal />
          </Suspense>
        </div>

        {/* Announcements List - dynamic data with own Suspense */}
        <Suspense
          fallback={
            <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
          }
        >
          <AnnouncementsListData />
        </Suspense>
      </div>
    </div>
  )
}
