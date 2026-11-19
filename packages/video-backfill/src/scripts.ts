import { REDIS_KEYS } from "@shinju-date/constants";
import type { Redis } from "@upstash/redis";

import { BACKFILL_JOB_TTL_SECONDS, jobKey, lockKey } from "./keys.js";
import type {
  BackfillClaim,
  BackfillJob,
  BackfillWriteResult,
} from "./types.js";

/**
 * Saves a job and queues it, but only if the job is still the version the
 * caller read (compare-and-set) and no worker holds it, so that two requests
 * made at the same moment, or a request that stalled, never save over each
 * other or over a worker's progress. Runs atomically on the Redis server.
 *
 * A job without a version counts as version 0, and so does one that cannot
 * be decoded, which never matches what a caller read.
 *
 * KEYS: job, queue, worker lock
 * ARGV: version of the job as read (empty when there was none), new job,
 * TTL, job ID
 *
 * @returns 1 when the job was queued, 0 when it changed in between.
 */
export const ENQUEUE_SCRIPT = `-- video-backfill:enqueue
local current = redis.call('GET', KEYS[1])
if ARGV[1] == '' then
  if current then return 0 end
else
  if not current then return 0 end
  local ok, job = pcall(cjson.decode, current)
  if not ok or type(job) ~= 'table' then return 0 end
  if (tonumber(job.version) or 0) ~= tonumber(ARGV[1]) then return 0 end
end
if redis.call('EXISTS', KEYS[3]) == 1 then return 0 end
-- LPUSH first: it is the only command here that can fail (WRONGTYPE), and
-- the script stops there without rolling back what ran before.
redis.call('LPUSH', KEYS[2], ARGV[4])
redis.call('EXPIRE', KEYS[2], ARGV[3])
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
return 1`;

/**
 * Takes the next job off the queue, locks it and saves it as `running` with
 * its version incremented, all at once, so that a worker that stops in
 * between never leaves a job off the queue but still `pending`.
 *
 * Queue entries of jobs that are locked by another worker (queued twice) are
 * dropped: that worker queues the job again if needed. Entries of jobs that
 * are finished or gone are dropped too.
 *
 * KEYS: queue, prefix of job keys, prefix of lock keys (the keys of a job are
 * the prefixes followed by its ID, which is only known once it is taken off
 * the queue)
 * ARGV: lock token, lease, timestamp, TTL
 *
 * @returns The job as saved (JSON), or nil when the queue is empty.
 */
export const CLAIM_SCRIPT = `-- video-backfill:claim
while true do
  local id = redis.call('RPOP', KEYS[1])
  if not id then return false end
  local lock = KEYS[3] .. id
  if redis.call('SET', lock, ARGV[1], 'EX', ARGV[2], 'NX') then
    local key = KEYS[2] .. id
    local value = redis.call('GET', key)
    local job = value and cjson.decode(value)
    if job and job.status ~= 'done' and job.status ~= 'failed' then
      job.status = 'running'
      if job.startedAt == nil or job.startedAt == cjson.null then
        job.startedAt = ARGV[3]
      end
      job.updatedAt = ARGV[3]
      job.version = (tonumber(job.version) or 0) + 1
      local encoded = cjson.encode(job)
      redis.call('SET', key, encoded, 'EX', ARGV[4])
      return encoded
    end
    redis.call('DEL', lock)
  end
end`;

/**
 * Saves a claimed job, only while its lock holds the claim's token.
 *
 * KEYS: job, worker lock
 * ARGV: lock token, job, TTL
 *
 * @returns 1 when the job was saved, 0 when the lock was lost.
 */
export const SAVE_SCRIPT = `-- video-backfill:save
if redis.call('GET', KEYS[2]) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
return 1`;

/**
 * Saves a claimed job that finished, also to the keys given after its lock
 * (such as its outcome for a check), and releases it, only while its lock
 * holds the claim's token. `SET` replaces a key of any type, so once the
 * lock is checked nothing here can fail halfway.
 *
 * KEYS: job, worker lock, keys to also save the job to (any number)
 * ARGV: lock token, job, TTL
 *
 * @returns 1 when the job was saved, 0 when the lock was lost.
 */
export const FINISH_SCRIPT = `-- video-backfill:finish
if redis.call('GET', KEYS[2]) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
for i = 3, #KEYS do
  redis.call('SET', KEYS[i], ARGV[2], 'EX', ARGV[3])
end
redis.call('DEL', KEYS[2])
return 1`;

/**
 * Puts a claimed job back at the end of the queue, saves it as pending and
 * releases it, atomically so a worker can claim it right away, and only while
 * its lock holds the claim's token.
 *
 * `LPUSH` is the only write here that can fail (on a key of the wrong
 * type), and a script stops at a failing command without rolling back the
 * ones before it, so it runs first: when it fails nothing changed and the job
 * stays claimed until its lease runs out. A MULTI transaction would not do:
 * it runs the remaining commands after a failing one, which would leave the
 * job pending without a queue entry.
 *
 * KEYS: queue, job, worker lock
 * ARGV: job ID, job, TTL, lock token
 *
 * @returns 1 when the job was queued, 0 when the lock was lost.
 */
export const REQUEUE_SCRIPT = `-- video-backfill:requeue
if redis.call('GET', KEYS[3]) ~= ARGV[4] then return 0 end
redis.call('LPUSH', KEYS[1], ARGV[1])
redis.call('EXPIRE', KEYS[1], ARGV[3])
redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3])
redis.call('DEL', KEYS[3])
return 1`;

/** A job as it is stored, with whether a worker holds its lock. */
export interface StoredJob {
  job: BackfillJob;
  locked: boolean;
}

/** Reads jobs by ID, in the same order; `null` for IDs without a job. */
export const readJobs = async (
  redis: Redis,
  ids: readonly string[]
): Promise<(StoredJob | null)[]> => {
  if (ids.length === 0) {
    return [];
  }

  const [jobs, locks] = await Promise.all([
    redis.mget<(BackfillJob | null)[]>(...ids.map(jobKey)),
    redis.mget<(unknown | null)[]>(...ids.map(lockKey)),
  ]);

  return jobs.map((job, index) =>
    job
      ? {
          job,
          locked: locks[index] !== null && locks[index] !== undefined,
        }
      : null
  );
};

/** The version of a job; 0 for one saved before versions existed. */
const getVersion = (job: BackfillJob): number => job.version ?? 0;

/** The job as it is written next: with its version incremented. */
const nextVersion = (job: BackfillJob): BackfillJob => ({
  ...job,
  version: getVersion(job) + 1,
});

/**
 * Saves a job and queues it with {@link ENQUEUE_SCRIPT}, unless the job in
 * Redis is no longer `current` (the job as the caller read it, or `null`
 * when there was none) or a worker holds it.
 *
 * @returns The job as saved, or `null` when nothing was saved.
 */
export const enqueueJob = async (
  redis: Redis,
  job: BackfillJob,
  current: BackfillJob | null
): Promise<BackfillJob | null> => {
  const saved: BackfillJob = {
    ...job,
    version: current ? getVersion(current) + 1 : 1,
  };
  const queued = await redis.eval<[string, string, number, string], number>(
    ENQUEUE_SCRIPT,
    [jobKey(job.id), REDIS_KEYS.VIDEO_BACKFILL_QUEUE, lockKey(job.id)],
    [
      current ? String(getVersion(current)) : "",
      JSON.stringify(saved),
      BACKFILL_JOB_TTL_SECONDS,
      job.id,
    ]
  );

  return queued === 1 ? saved : null;
};

export interface ClaimJobOptions {
  /** How long the claim is locked, in seconds. */
  leaseSeconds: number;
  now: Temporal.Instant;
}

/**
 * Claims the next job with {@link CLAIM_SCRIPT}, locked with a token made
 * for the claim.
 *
 * @returns `null` when the queue is empty.
 */
export const claimJob = async (
  redis: Redis,
  { leaseSeconds, now }: ClaimJobOptions
): Promise<BackfillClaim | null> => {
  const token = crypto.randomUUID();
  const reply = await redis.eval<
    [string, number, string, number],
    BackfillJob | string | null
  >(
    CLAIM_SCRIPT,
    [
      REDIS_KEYS.VIDEO_BACKFILL_QUEUE,
      REDIS_KEYS.VIDEO_BACKFILL_JOB_PREFIX,
      REDIS_KEYS.VIDEO_BACKFILL_LOCK_PREFIX,
    ],
    [token, leaseSeconds, now.toString(), BACKFILL_JOB_TTL_SECONDS]
  );

  if (reply === null || reply === undefined) {
    return null;
  }

  // `@upstash/redis` parses the JSON of the reply unless it was created
  // without automatic deserialization.
  const job: BackfillJob =
    typeof reply === "string" ? JSON.parse(reply) : reply;

  return { job, token };
};

/** Runs a write of a claimed job, with its version incremented. */
const writeClaimed = async (
  redis: Redis,
  script: string,
  keys: string[],
  args: (job: string) => unknown[],
  job: BackfillJob
): Promise<BackfillWriteResult> => {
  const saved = nextVersion(job);
  const reply = await redis.eval<unknown[], number>(
    script,
    keys,
    args(JSON.stringify(saved))
  );

  return reply === 1 ? { job: saved, status: "saved" } : { status: "lost" };
};

/** Saves a claimed job with {@link SAVE_SCRIPT}, and keeps it claimed. */
export const saveJob = (
  redis: Redis,
  { job, token }: BackfillClaim
): Promise<BackfillWriteResult> =>
  writeClaimed(
    redis,
    SAVE_SCRIPT,
    [jobKey(job.id), lockKey(job.id)],
    (value) => [token, value, BACKFILL_JOB_TTL_SECONDS],
    job
  );

/**
 * Saves a claimed job that finished with {@link FINISH_SCRIPT}, also to
 * `copies`, and releases it.
 */
export const finishJob = (
  redis: Redis,
  { job, token }: BackfillClaim,
  copies: readonly string[] = []
): Promise<BackfillWriteResult> =>
  writeClaimed(
    redis,
    FINISH_SCRIPT,
    [jobKey(job.id), lockKey(job.id), ...copies],
    (value) => [token, value, BACKFILL_JOB_TTL_SECONDS],
    job
  );

/** Puts a claimed job back in the queue with {@link REQUEUE_SCRIPT}. */
export const requeueJob = (
  redis: Redis,
  { job, token }: BackfillClaim
): Promise<BackfillWriteResult> =>
  writeClaimed(
    redis,
    REQUEUE_SCRIPT,
    [REDIS_KEYS.VIDEO_BACKFILL_QUEUE, jobKey(job.id), lockKey(job.id)],
    (value) => [job.id, value, BACKFILL_JOB_TTL_SECONDS, token],
    job
  );
