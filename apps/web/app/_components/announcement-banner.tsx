'use client'

import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeExternalLinks from 'rehype-external-links'
import remarkGfm from 'remark-gfm'
import {
  type Announcement,
  dismissAnnouncement,
  getAnnouncement,
} from '../_lib/actions'

// Get banner background and text color based on level
function getBannerClasses(level: string): string {
  switch (level) {
    case 'warning':
      return 'bg-yellow-50 text-yellow-900 border-yellow-300'
    case 'alert':
      return 'bg-red-50 text-red-900 border-red-300'
    default:
      return 'bg-774-blue-50 text-774-blue-900 border-774-blue-300'
  }
}

/**
 * Site-wide announcement banner.
 *
 * The banner is rendered in the normal page flow directly below the header
 * instead of being fixed to the viewport, so it never covers the main content
 * or its interactive areas while scrolling. The message is collapsed to a
 * single line by default and can be expanded by clicking it.
 */
export function AnnouncementBanner({
  announcement: initialAnnouncement,
}: {
  announcement: Announcement
}) {
  const [isVisible, setIsVisible] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  // Periodically refetch announcement data
  const { data } = useQuery({
    enabled: isVisible,
    initialData: initialAnnouncement,
    queryFn: async () => {
      const announcement = await getAnnouncement()
      if (!announcement) {
        // If no announcement is available, hide the banner
        setIsVisible(false)
        return null
      }
      return announcement
    },
    queryKey: ['announcement'],
    refetchInterval: 1_000 * 60, // Refetch every 60 seconds
    refetchIntervalInBackground: true,
  })

  if (!isVisible || !data) {
    return null
  }

  return (
    <div
      className={`border-b ${getBannerClasses(data.level)}`}
      data-testid="announcement-banner"
      role="status"
    >
      <div className="mx-auto flex max-w-6xl items-start justify-between gap-3 px-4 py-3">
        <button
          aria-expanded={isExpanded}
          className="min-w-0 flex-1 cursor-pointer text-left"
          onClick={() => setIsExpanded(!isExpanded)}
          type="button"
        >
          <div
            className={`prose prose-sm max-w-none ${
              !isExpanded ? 'line-clamp-1' : ''
            }`}
          >
            <ReactMarkdown
              rehypePlugins={[
                [
                  rehypeExternalLinks,
                  {
                    rel: ['nofollow', 'noopener', 'noreferrer'],
                    target: '_blank',
                  },
                ],
              ]}
              remarkPlugins={[remarkGfm]}
            >
              {data.message}
            </ReactMarkdown>
          </div>
        </button>
        <button
          aria-label="お知らせを閉じる"
          className="-m-1 shrink-0 cursor-pointer rounded-md p-1 hover:bg-black/10"
          onClick={async () => {
            await dismissAnnouncement(data.id)
            setIsVisible(false)
          }}
          type="button"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
    </div>
  )
}
