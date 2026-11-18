import { z } from "zod";

export const payloadSchema = z.object({
  query: z.string().trim().min(1),
});

export type Payload = z.infer<typeof payloadSchema>;
