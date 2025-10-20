import { TIME_ZONE } from '@shinju-date/constants'
import { Temporal } from 'temporal-polyfill'
import { getLastVideoSync } from '../_lib/get-last-sync'

export async function LastSyncTimestamp() {
  const lastSync = await getLastVideoSync()

  if (!lastSync) {
    return <span className="text-slate-300 text-sm">最終同期: N/A</span>
  }

  try {
    const instant = Temporal.Instant.from(lastSync)
    const zonedDateTime = instant.toZonedDateTimeISO(TIME_ZONE)
    const formatted = zonedDateTime.toLocaleString('ja-JP', {
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

    return <span className="text-slate-300 text-sm">最終同期: {formatted}</span>
  } catch (error) {
    console.error('Failed to parse last sync timestamp:', error)
    return <span className="text-slate-300 text-sm">最終同期: N/A</span>
  }
}
