'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeExternalLinks from 'rehype-external-links'
import remarkGfm from 'remark-gfm'
import { dismissAnnouncement } from '@/lib/announcement/dismiss-announcement-action'
import { getAnnouncementAction } from '@/lib/announcement/get-announcement-action'

type AnnouncementBannerProps = {
  message: string
  level: string
  initialId: string
  startAt: string
  endAt: string
}

// Get banner background and text color based on level
function getBannerClasses(level: string): string {
  switch (level) {
    case 'warning':
      return 'bg-yellow-50 text-yellow-900 border-yellow-300'
    case 'alert':
      return 'bg-red-50 text-red-900 border-red-300'
    default:
      return 'bg-blue-50 text-blue-900 border-blue-300'
  }
}

export function AnnouncementBanner({
  message: initialMessage,
  level: initialLevel,
  initialId,
  startAt: initialStartAt,
  endAt: initialEndAt,
}: AnnouncementBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  // Periodically refetch announcement data
  const { data } = useQuery({
    enabled: isVisible,
    initialData: {
      end_at: initialEndAt,
      id: initialId,
      level: initialLevel,
      message: initialMessage,
      start_at: initialStartAt,
    },
    queryFn: async () => {
      const announcement = await getAnnouncementAction()
      if (!announcement) {
        // If no announcement is available, hide the banner
        setIsVisible(false)
        return null
      }
      return announcement
    },
    queryKey: ['announcement'],
    refetchInterval: 60000, // Refetch every 60 seconds
    refetchIntervalInBackground: true,
  })

  if (!isVisible || !data) {
    return null
  }

  return (
    <div
      className={`fixed z-50 max-w-md rounded-lg border p-4 shadow-lg ${getBannerClasses(data.level)}`}
      role="alert"
      style={{
        bottom: 'calc(1rem + env(safe-area-inset-bottom))',
        left: 'calc(1rem + env(safe-area-inset-left))',
        right: 'calc(1rem + env(safe-area-inset-right))',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <button
          className="flex-1 cursor-pointer text-left"
          onClick={() => setIsExpanded(!isExpanded)}
          type="button"
        >
          <div
            className={`prose prose-sm max-w-none ${!isExpanded ? 'line-clamp-1' : ''}`}
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
          className="flex-shrink-0 rounded-md p-1 hover:bg-black/10"
          onClick={async () => {
            await dismissAnnouncement(data.id)
            setIsVisible(false)
          }}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M6 18L18 6M6 6l12 12"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
