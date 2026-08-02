import { z } from 'zod'
import { providerSchema } from '@/lib/provider'

export const querySchema = z.object({
  mode: z.enum(['recent', 'all']).optional(),
  provider: providerSchema,
})
