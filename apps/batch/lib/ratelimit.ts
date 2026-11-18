import { REDIS_KEYS } from "@shinju-date/constants";

import { redisClient } from "./redis";

export interface OncePerWindowLimiter {
  limit(identifier: string): Promise<{ success: boolean }>;
}

/**
 * Lets a job run only once in each window of `windowSeconds`.
 *
 * The windows are fixed in time (the current time divided by the window,
 * rounded down), like `Ratelimit.fixedWindow(1, …)` of `@upstash/ratelimit`,
 * and the keys have the same format (`ratelimit:cron:<identifier>:<window>`).
 * Counting from the previous run instead (`SET NX EX`) would reject a run on
 * schedule that arrives slightly early.
 *
 * Unlike `@upstash/ratelimit`, it sends no Lua script, so it also works with a
 * local Redis, which rejects the `#!lua flags=allow-key-locking` shebang that
 * only Upstash accepts.
 */
export const limitOncePerWindow = async (
  identifier: string,
  windowSeconds: number
): Promise<{ success: boolean }> => {
  const windowMilliseconds = windowSeconds * 1000;
  const window = Math.floor(
    Temporal.Now.instant().epochMilliseconds / windowMilliseconds
  );
  const key = `${REDIS_KEYS.RATELIMIT_CRON_PREFIX}${identifier}:${window}`;

  const [count] = await redisClient
    .multi()
    .incr(key)
    .expire(key, windowSeconds)
    .exec<[number, number]>();

  return { success: count === 1 };
};

const oncePer = (duration: Temporal.DurationLike): OncePerWindowLimiter => {
  const windowSeconds = Temporal.Duration.from(duration).total("seconds");

  return {
    limit: (identifier) => limitOncePerWindow(identifier, windowSeconds),
  };
};

/**
 * `/videos/backfill` lets its runs overlap, so it is limited to one run in
 * each window instead of being locked like the other cron jobs.
 */
export const videosBackfill = oncePer({ seconds: 30 });
