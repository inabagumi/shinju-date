import { Redis } from "@upstash/redis";

import { serverEnv } from "./env";

export const redisClient = new Redis({
  token: serverEnv.UPSTASH_REDIS_REST_TOKEN,
  url: serverEnv.UPSTASH_REDIS_REST_URL,
});
