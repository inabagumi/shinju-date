import type { Temporal } from 'temporal-polyfill'

/**
 * Formats a Temporal.Duration to a readable format (e.g., 1:30:15 or 5:30)
 * @param duration - Temporal.Duration object
 * @returns Formatted duration string (H:MM:SS or M:SS)
 */
export default function formatDuration(duration: Temporal.Duration): string {
  const hours = duration.hours
  const minutes = duration.minutes
  const seconds = duration.seconds

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
