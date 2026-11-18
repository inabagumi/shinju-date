import { REDIS_KEYS } from "@shinju-date/constants";

import { redisClient } from "./redis";

/**
 * Deletes the lock only if it still holds the value of the run that took
 * it. The name in the first line lets the Redis of MSW emulate the script.
 */
export const RELEASE_LOCK_SCRIPT = `-- batch:release-lock
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0`;

const getLockKey = (identifier: string): string =>
  `${REDIS_KEYS.CRON_LOCK_PREFIX}${identifier}`;

/**
 * Takes the lock of `identifier` for `ttlSeconds` (`SET NX EX`).
 *
 * Returns the random value the lock holds, which `releaseLock` needs, or
 * `null` when another run holds the lock.
 */
export const acquireLock = async (
  identifier: string,
  ttlSeconds: number
): Promise<string | null> => {
  const value = crypto.randomUUID();
  const result = await redisClient.set(getLockKey(identifier), value, {
    ex: ttlSeconds,
    nx: true,
  });

  return result === "OK" ? value : null;
};

/**
 * Releases the lock of `identifier` if it still holds `value`. The lock may
 * have run out and been taken by another run in the meantime, and that lock
 * must be kept. The comparison and the deletion are one script, so another
 * run cannot take the lock in between.
 *
 * Returns whether the lock was released.
 */
export const releaseLock = async (
  identifier: string,
  value: string
): Promise<boolean> => {
  const deleted = await redisClient.eval<[string], number>(
    RELEASE_LOCK_SCRIPT,
    [getLockKey(identifier)],
    [value]
  );

  return deleted === 1;
};
