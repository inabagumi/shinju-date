import type { Temporal } from 'temporal-polyfill'

/**
 * Formats a Temporal.Duration to a readable format (e.g., 1:30:15 or 5:30)
 * @param duration - Temporal.Duration object
 * @returns Formatted duration string (H:MM:SS or M:SS)
 */
export default function formatDuration(duration: Temporal.Duration): string {
  const hours = duration.hours

  if (hours > 0) {
    // biome-ignore lint/suspicious/noExplicitAny: toLocaleString accepts DurationFormatOptions
    return (duration as any).toLocaleString('ja-JP', {
      hours: 'numeric',
      minutes: '2-digit',
      seconds: '2-digit',
      style: 'digital',
    })
  }

  // biome-ignore lint/suspicious/noExplicitAny: toLocaleString accepts DurationFormatOptions
  return (duration as any).toLocaleString('ja-JP', {
    minutes: 'numeric',
    seconds: '2-digit',
    style: 'digital',
  })
}
