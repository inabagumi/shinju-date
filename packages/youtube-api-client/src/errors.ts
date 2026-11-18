/**
 * Returns true when a YouTube Data API call failed with the given HTTP status.
 */
export function isYouTubeApiError(error: unknown, status: number): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const candidate = error as {
    code?: unknown
    response?: { status?: unknown }
    status?: unknown
  }

  return (
    candidate.status === status ||
    candidate.response?.status === status ||
    Number(candidate.code) === status
  )
}
