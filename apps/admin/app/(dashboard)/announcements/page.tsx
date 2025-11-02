import { AnnouncementsList } from './_components/announcements-list'
import getAnnouncements from './_lib/get-announcements'

export default async function AnnouncementsPage() {
  const announcements = await getAnnouncements()

  return (
    <div className="p-6">
      <AnnouncementsList announcements={announcements} />
    </div>
  )
}
