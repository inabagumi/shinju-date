'use client'

import { usePathname, useRouter } from 'next/navigation'
import { use } from 'react'
import type { AnalyticsSearchParams } from '../_lib/search-params-schema'
import { createAnalyticsUrlParams } from '../_lib/search-params-schema'
import DateRangePicker from './date-range-picker'

type Props = {
  searchParams: Promise<AnalyticsSearchParams>
}

/**
 * Client component wrapper for DateRangePicker that handles URL navigation
 */
export function DateRangePickerClient({ searchParams }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const { dateRange } = use(searchParams)

  const handleDateRangeChange = (newDateRange: {
    startDate: string
    endDate: string
  }) => {
    const queryString = createAnalyticsUrlParams(newDateRange)
    router.replace(`${pathname}?${queryString}`)
  }

  return (
    <DateRangePicker
      onChange={handleDateRangeChange}
      showComparison={true}
      value={dateRange}
    />
  )
}
