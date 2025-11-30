import * as z from 'zod'

export const querySchema = z.object({
  mode: z.enum(['recent', 'all']).optional(),
})
