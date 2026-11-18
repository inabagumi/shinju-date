import { CACHE_TAGS } from "@shinju-date/constants";
import { z } from "zod";

export const payloadSchema = z.object({
  tags: z.array(z.enum(Object.values(CACHE_TAGS))).min(1),
});

export type Payload = z.infer<typeof payloadSchema>;
