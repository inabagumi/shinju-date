import type { Temporal } from 'temporal-polyfill'

/**
 * Formats a Temporal.Duration to a readable format (e.g., 1:30:15 or 5:30)
 * @param duration - Temporal.Duration object
 * @returns Formatted duration string (H:MM:SS or M:SS)
 */
export default function formatDuration(duration: Temporal.Duration): string {
  return duration.toLocaleString('ja-JP', {
    hours: 'numeric',
    hoursDisplay: 'auto',
    minutes: '2-digit',
    seconds: '2-digit',
    style: 'digital',
  } as Intl.DateTimeFormatOptions)
}
