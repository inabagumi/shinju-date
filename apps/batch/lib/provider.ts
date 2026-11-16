import { Constants } from '@shinju-date/database'
import { z } from 'zod'

/**
 * Content provider for multi-platform batch jobs.
 * Default is `youtube` so existing cron paths stay backward compatible.
 */
export const providerSchema = z
  .enum(Constants.public.Enums.platform_type)
  .default('youtube')

/** Query of the routes that only take `provider`. */
export const providerQuerySchema = z.object({
  provider: providerSchema,
})
