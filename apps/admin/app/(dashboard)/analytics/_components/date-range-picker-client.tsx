'use client'

import { useSearchParams } from 'next/navigation'
import { use } from 'react'
import { useUpdateSearchParams } from '@/lib/use-update-search-params'
import { getDateRangeUpdates } from '../_lib/analytics-url-params'
import type { AnalyticsSearchParams } from '../_lib/search-params-schema'
import DateRangePicker, { type DateRange } from './date-range-picker'

interface Props {
  searchParams: Promise<AnalyticsSearchParams>
}

/**
 * Client component wrapper for DateRangePicker that handles URL navigation
 */
export function DateRangePickerClient({ searchParams }: Props) {
  const urlSearchParams = useSearchParams()
  const updateSearchParams = useUpdateSearchParams()
  const { dateRange } = use(searchParams)

  const handleDateRangeChange = (newDateRange: DateRange) => {
    updateSearchParams(
      getDateRangeUpdates(urlSearchParams.get('date'), newDateRange),
    )
  }

  return <DateRangePicker onChange={handleDateRangeChange} value={dateRange} />
}
