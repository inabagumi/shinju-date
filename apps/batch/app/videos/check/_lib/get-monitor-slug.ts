import type { Provider } from '@/lib/provider'
import type { CheckMode } from './types'

export function getMonitorSlug({
  mode,
  provider = 'youtube',
}: {
  mode: CheckMode
  provider?: Provider
}) {
  const params = new URLSearchParams()
  if (provider === 'twitch') {
    params.set('provider', 'twitch')
  }
  if (mode === 'all' || mode === 'recent') {
    params.set('mode', mode)
  }

  const query = params.toString()
  return query ? `/videos/check?${query}` : '/videos/check'
}
