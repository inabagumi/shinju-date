import type { Provider } from '@/lib/provider'

/**
 * Monitor slug for Sentry check-in
 */
export function getMonitorSlug(provider: Provider = 'youtube') {
  return provider === 'twitch'
    ? '/videos/update?provider=twitch'
    : '/videos/update'
}

/** @deprecated Use getMonitorSlug(provider) */
export const MONITOR_SLUG = '/videos/update'
