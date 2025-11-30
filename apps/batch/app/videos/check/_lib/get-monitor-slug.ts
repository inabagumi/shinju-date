import type { CheckMode } from './types'

export function getMonitorSlug({ mode }: { mode: CheckMode }) {
  if (mode === 'all') {
    return '/videos/check?mode=all'
  }
  if (mode === 'recent') {
    return '/videos/check?mode=recent'
  }
  return '/videos/check'
}
