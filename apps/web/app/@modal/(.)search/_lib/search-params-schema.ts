import * as z from 'zod'

export const searchParamsSchema = z.object({
  q: z
    .preprocess(
      (val) => (Array.isArray(val) ? val[0] : val),
      z
        .string()
        .optional()
        .transform((val) => val?.trim()),
    )
    .optional(),
})
