'use client'

import { useQuery } from '@tanstack/react-query'
import { Megaphone, Minus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
 * Site-wide announcement banner that sticks to the bottom of the viewport.
 *
 * Besides dismissing the announcement for good, the banner can be minimized
 * into a small pill so that it stops covering the content underneath without
 * hiding the announcement entirely. The message is collapsed to a single line
 * by default and can be expanded by clicking it.
 */
export function AnnouncementBanner({
  announcement: initialAnnouncement,
}: {
  announcement: Announcement
}) {
  const [isVisible, setIsVisible] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const minimizeButtonRef = useRef<HTMLButtonElement>(null)
  const restoreButtonRef = useRef<HTMLButtonElement>(null)
  const hasToggledMinimizedRef = useRef(false)

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

  // Keep keyboard focus on the control that replaced the one just used
  useEffect(() => {
    if (!hasToggledMinimizedRef.current) {
      return
    }

    if (isMinimized) {
      restoreButtonRef.current?.focus()
    } else {
      minimizeButtonRef.current?.focus()
    }
  }, [isMinimized])

  if (!isVisible || !data) {
    return null
  }

  const bannerClasses = getBannerClasses(data.level)

  // The sticky wrapper spans the full width of the page, so pointer events are
  // disabled on it and re-enabled only on the visible banner / pill. Otherwise
  // the transparent area next to them would block clicks on the content.

  const toggleMinimized = () => {
    hasToggledMinimizedRef.current = true
    setIsMinimized((value) => !value)
  }

  if (isMinimized) {
    return (
      <div className="pointer-events-none sticky bottom-4 z-50 safe-area-mx">
        <div className="mb-4 flex justify-end">
          <button
            aria-expanded={false}
            aria-label="お知らせを表示"
            className={`pointer-events-auto flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold shadow-lg ${bannerClasses}`}
            data-testid="announcement-banner-minimized"
            onClick={toggleMinimized}
            ref={restoreButtonRef}
            type="button"
          >
            <Megaphone aria-hidden="true" className="size-4" />
            お知らせ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pointer-events-none sticky bottom-4 z-50 safe-area-mx">
      <div
        className={`pointer-events-auto mb-4 ml-auto max-w-md rounded-lg border p-4 shadow-lg ${bannerClasses}`}
        data-testid="announcement-banner"
        role="alert"
      >
        <div className="flex items-start justify-between gap-3">
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
          <div className="flex shrink-0 items-center gap-1">
            <button
              aria-label="お知らせを縮小"
              className="cursor-pointer rounded-md p-1 hover:bg-black/10"
              onClick={toggleMinimized}
              ref={minimizeButtonRef}
              type="button"
            >
              <Minus aria-hidden="true" className="size-5" />
            </button>
            <button
              aria-label="お知らせを閉じる"
              className="cursor-pointer rounded-md p-1 hover:bg-black/10"
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
      </div>
    </div>
  )
}
