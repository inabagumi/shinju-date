'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { use } from 'react'
import { updateDateRangeParams } from '../_lib/analytics-url-params'
import type { AnalyticsSearchParams } from '../_lib/search-params-schema'
import DateRangePicker, { type DateRange } from './date-range-picker'

interface Props {
  searchParams: Promise<AnalyticsSearchParams>
}

/**
 * Client component wrapper for DateRangePicker that handles URL navigation
 */
export function DateRangePickerClient({ searchParams }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const urlSearchParams = useSearchParams()
  const { dateRange } = use(searchParams)

  const handleDateRangeChange = (newDateRange: DateRange) => {
    const queryString = updateDateRangeParams(urlSearchParams, newDateRange)
    router.replace(`${pathname}?${queryString}`)
  }

  return <DateRangePicker onChange={handleDateRangeChange} value={dateRange} />
}
