import type { Temporal } from 'temporal-polyfill'

// Cached formatters for performance
let hourFormatter: Intl.DurationFormat | undefined
let minuteFormatter: Intl.DurationFormat | undefined
let hasCheckedIntlSupport = false
let supportsIntlDurationFormat = false

/**
 * Check if Intl.DurationFormat is available (cached result)
 */
function hasIntlDurationFormat(): boolean {
  if (!hasCheckedIntlSupport) {
    hasCheckedIntlSupport = true
    supportsIntlDurationFormat =
      typeof Intl !== 'undefined' && 'DurationFormat' in Intl
  }
  return supportsIntlDurationFormat
}

/**
 * Get or create cached Intl.DurationFormat for hours, minutes, and seconds
 */
function getHourFormatter(): Intl.DurationFormat | undefined {
  if (!hourFormatter && hasIntlDurationFormat()) {
    try {
      hourFormatter = new Intl.DurationFormat('ja-JP', {
        hours: 'numeric',
        minutes: '2-digit',
        seconds: '2-digit',
        style: 'digital',
      })
    } catch {
      // If creation fails, return undefined
      return undefined
    }
  }
  return hourFormatter
}

/**
 * Get or create cached Intl.DurationFormat for minutes and seconds only
 */
function getMinuteFormatter(): Intl.DurationFormat | undefined {
  if (!minuteFormatter && hasIntlDurationFormat()) {
    try {
      minuteFormatter = new Intl.DurationFormat('ja-JP', {
        minutes: 'numeric',
        seconds: '2-digit',
        style: 'digital',
      })
    } catch {
      // If creation fails, return undefined
      return undefined
    }
  }
  return minuteFormatter
}

/**
 * Formats a Temporal.Duration to a readable format (e.g., 1:30:15 or 5:30)
 * @param duration - Temporal.Duration object
 * @returns Formatted duration string (H:MM:SS or M:SS)
 */
export default function formatDuration(duration: Temporal.Duration): string {
  const hours = duration.hours
  const minutes = duration.minutes
  const seconds = duration.seconds
  const hasHours = hours > 0

  // Try to use Intl.DurationFormat if available
  if (hasIntlDurationFormat()) {
    try {
      const formatter = hasHours ? getHourFormatter() : getMinuteFormatter()
      if (formatter) {
        const formatted = formatter.format(duration)
        // Verify that the result looks like a formatted duration (not ISO string)
        if (formatted && !formatted.startsWith('PT')) {
          return formatted
        }
      }
    } catch {
      // Fall through to fallback methods
    }
  }

  // Fall back to Temporal.Duration.prototype.toLocaleString()
  // This may work in some environments
  try {
    // biome-ignore lint/suspicious/noExplicitAny: toLocaleString may accept DurationFormatOptions in some environments
    const formatted = (duration as any).toLocaleString('ja-JP', {
      hours: hasHours ? 'numeric' : undefined,
      minutes: '2-digit',
      seconds: '2-digit',
      style: 'digital',
    })
    // Verify that the result looks like a formatted duration (not ISO string)
    if (formatted && !formatted.startsWith('PT')) {
      return formatted
    }
  } catch {
    // Fall through to manual formatting
  }

  // Final fallback: manual formatting
  if (hasHours) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
