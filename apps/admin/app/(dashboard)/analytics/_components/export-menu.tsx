'use client'

import { useState } from 'react'

type ExportType = 'videos' | 'channels' | 'keywords' | 'search-exit-rates'

type Props = {
  type: ExportType
  dateRange: { startDate: string; endDate: string }
  selectedDate?: string | null
  disabled?: boolean
}

export function ExportMenu({
  type,
  dateRange,
  selectedDate,
  disabled = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)

  const handleExport = () => {
    const params = new URLSearchParams()

    if (selectedDate) {
      // Single date export
      params.set('date', selectedDate)
    } else {
      // Date range export
      params.set('from', dateRange.startDate)
      if (dateRange.endDate !== dateRange.startDate) {
        params.set('to', dateRange.endDate)
      }
    }

    const url = `/api/export/${type}?${params.toString()}`

    // Create a temporary link and trigger download
    const link = document.createElement('a')
    link.href = url
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        aria-label="エクスポートメニュー"
        className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>メニュー</title>
          <path
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <button
            aria-label="メニューを閉じる"
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            type="button"
          />

          {/* Menu */}
          <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
            <button
              className="flex w-full items-center px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              onClick={handleExport}
              type="button"
            >
              <svg
                aria-hidden="true"
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>ダウンロード</title>
                <path
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              CSV エクスポート
            </button>
          </div>
        </>
      )}
    </div>
  )
}
