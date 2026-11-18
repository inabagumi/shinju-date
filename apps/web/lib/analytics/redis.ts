import { formatDateKey, getMondayOfWeek } from "@shinju-date/temporal-fns";
import type { Pipeline } from "@upstash/redis";

const DAY_SECONDS = 24 * 60 * 60;

/** How long the keys of one day are kept. */
export const DAILY_TTL_SECONDS = 90 * DAY_SECONDS;

/** How long the keys of one week are kept. */
export const WEEKLY_TTL_SECONDS = 35 * DAY_SECONDS;

/** The key of the day of `now`: the prefix followed by `YYYYMMDD`. */
export function dailyKey(prefix: string, now: Temporal.ZonedDateTime): string {
  return `${prefix}${formatDateKey(now)}`;
}

/**
 * The key of the week of `now`: the prefix followed by the `YYYYMMDD` of the
 * Monday of that week.
 */
export function weeklyKey(prefix: string, now: Temporal.ZonedDateTime): string {
  return `${prefix}${getMondayOfWeek(now)}`;
}

/*
 * Each function below queues a write together with the `expire` of its key,
 * so that a key cannot be written without a TTL. Write the daily and weekly
 * keys only through them.
 */

/** Queues `INCR` on the key and its TTL. */
export function incrWithTtl(
  multi: Pipeline,
  key: string,
  ttlSeconds: number
): void {
  multi.incr(key);
  multi.expire(key, ttlSeconds);
}

/** Queues `ZINCRBY` on the key and its TTL. */
export function zincrbyWithTtl(
  multi: Pipeline,
  key: string,
  increment: number,
  member: string,
  ttlSeconds: number
): void {
  multi.zincrby(key, increment, member);
  multi.expire(key, ttlSeconds);
}

/** Queues `SADD` on the key and its TTL. */
export function saddWithTtl(
  multi: Pipeline,
  key: string,
  member: string,
  ttlSeconds: number
): void {
  multi.sadd(key, member);
  multi.expire(key, ttlSeconds);
}

/** Queues `HINCRBY` on the key and its TTL. */
export function hincrbyWithTtl(
  multi: Pipeline,
  key: string,
  field: string,
  increment: number,
  ttlSeconds: number
): void {
  multi.hincrby(key, field, increment);
  multi.expire(key, ttlSeconds);
}
