'use client'

import { useState } from 'react'

type AnnouncementBannerProps = {
  message: string
  level: string
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
  message,
  level,
}: AnnouncementBannerProps) {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) {
    return null
  }

  return (
    <div
      className={`sticky top-0 z-40 border-b px-4 py-3 ${getBannerClasses(level)}`}
      role="alert"
    >
      <div className="mx-auto flex max-w-6xl items-start justify-between gap-4">
        <p className="flex-1 text-sm">{message}</p>
        <button
          aria-label="お知らせを閉じる"
          className="flex-shrink-0 rounded-md p-1 hover:bg-black/10"
          onClick={() => setIsVisible(false)}
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
