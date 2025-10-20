/**
 * Formats an ISO 8601 duration string (e.g., PT1H30M15S) to a readable format (e.g., 1:30:15)
 * @param duration - ISO 8601 duration string
 * @returns Formatted duration string (H:MM:SS or M:SS)
 */
export function formatDuration(duration: string): string {
  // Parse ISO 8601 duration format (PT1H30M15S)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)

  if (!match) {
    return '0:00'
  }

  const hours = Number.parseInt(match[1] || '0', 10)
  const minutes = Number.parseInt(match[2] || '0', 10)
  const seconds = Number.parseInt(match[3] || '0', 10)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
