'use client'

import { usePathname, useRouter } from 'next/navigation'
import { getAnalyticsDateParams } from '../_lib/cached-params'
import { createAnalyticsUrlParams } from '../_lib/search-params-schema'
import DateRangePicker from './date-range-picker'

type Props = {
  searchParams: { [key: string]: string | string[] | undefined }
}

/**
 * Client component wrapper for DateRangePicker that handles URL navigation
 */
export function DateRangePickerClient({ searchParams }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const { dateRange } = getAnalyticsDateParams(searchParams)

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
