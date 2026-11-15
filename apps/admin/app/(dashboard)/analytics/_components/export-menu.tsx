'use client'

import { Download, EllipsisVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/dropdown-menu'

type ExportType = 'videos' | 'talents' | 'keywords' | 'search-exit-rates'

interface Props {
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
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="エクスポートメニュー"
        className="flex size-8 items-center justify-center border border-border disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
      >
        <EllipsisVertical aria-hidden="true" className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleExport}>
          <Download aria-hidden="true" className="size-4" />
          CSV エクスポート
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
