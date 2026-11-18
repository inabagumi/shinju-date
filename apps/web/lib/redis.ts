import { Redis } from "@upstash/redis";

import { serverEnv } from "@/lib/env";

let redisClient: Redis | undefined;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      cache: "default",
      token: serverEnv.UPSTASH_REDIS_REST_TOKEN,
      url: serverEnv.UPSTASH_REDIS_REST_URL,
    });
  }

  return redisClient;
}
