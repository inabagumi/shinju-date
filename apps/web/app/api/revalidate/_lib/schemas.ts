import { z } from 'zod'

export const payloadSchema = z.object({
  tags: z.string().min(1).array().nonempty()
})

export type Payload = z.infer<typeof payloadSchema>
