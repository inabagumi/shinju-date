'use server'

import { unstable_cache } from 'next/cache'
import { getAnnouncement } from './get-announcement'

/**
 * Server function to get announcement with cache tags
 * This allows client components to fetch announcements through server functions
 */
export async function getAnnouncementAction() {
  const cachedGetAnnouncement = unstable_cache(
    async () => getAnnouncement(),
    ['announcement'],
    {
      revalidate: 60, // Cache for 60 seconds
      tags: ['announcements'],
    },
  )

  return cachedGetAnnouncement()
}
