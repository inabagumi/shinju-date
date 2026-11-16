import { z } from 'zod'
import { providerQuerySchema } from '@/lib/provider'

export const querySchema = providerQuerySchema.extend({
  mode: z.enum(['recent', 'all']).optional(),
})
