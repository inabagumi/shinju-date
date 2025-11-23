'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { DailySearchVolume } from '../_lib/get-search-volume'

interface Props {
  data: DailySearchVolume[]
  ChartComponent: React.ComponentType<{
    data: DailySearchVolume[]
    onDateClick?: (date: string) => void
  }>
}

/**
 * Client wrapper that adds date click functionality to the search volume chart
 */
export function SearchVolumeChartWithNavigation({
  data,
  ChartComponent,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const urlSearchParams = useSearchParams()

  const handleDateClick = (date: string) => {
    const params = new URLSearchParams(urlSearchParams.toString())
    const currentDate = params.get('date')

    // If clicking the same date, clear it to show full range rankings
    if (currentDate === date) {
      params.delete('date')
    } else {
      // Set the new date to filter rankings to that specific date
      // Keep from/to params so chart range stays the same
      params.set('date', date)
    }

    const queryString = params.toString()
    const url = queryString ? `${pathname}?${queryString}` : pathname
    router.replace(url)
  }

  return <ChartComponent data={data} onDateClick={handleDateClick} />
}
