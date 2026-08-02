import { z } from 'zod'

/**
 * Content provider for multi-platform batch jobs.
 * Default is `youtube` so existing cron paths stay backward compatible.
 */
export const providerSchema = z.enum(['youtube', 'twitch']).default('youtube')

export type Provider = z.infer<typeof providerSchema>

export function parseProvider(
  value: string | null | undefined,
): { success: true; provider: Provider } | { success: false; error: string } {
  const result = providerSchema.safeParse(value ?? undefined)
  if (!result.success) {
    return {
      error: 'Invalid provider. Expected "youtube" or "twitch".',
      success: false,
    }
  }
  return { provider: result.data, success: true }
}
