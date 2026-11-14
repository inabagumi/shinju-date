import type { TablesInsert } from '@shinju-date/database'
import { toDBString } from '@shinju-date/temporal-fns'
import type { BackfillJob } from '@shinju-date/video-backfill'
import { Temporal } from 'temporal-polyfill'
import type { TypedSupabaseClient } from './supabase'

function toTimestamp(value: string): string {
  return toDBString(Temporal.Instant.from(value))
}

/**
 * Converts a finished job into a row of `video_backfill_jobs`.
 *
 * @throws {TypeError} When the job has not finished.
 */
export function toBackfillHistoryRow(
  job: BackfillJob,
): TablesInsert<'video_backfill_jobs'> {
  if ((job.status !== 'done' && job.status !== 'failed') || !job.finishedAt) {
    throw new TypeError(`Backfill job ${job.id} has not finished.`)
  }

  return {
    account_id: job.accountId,
    added: job.added,
    error: job.error,
    finished_at: toTimestamp(job.finishedAt),
    pages: job.pages,
    platform: job.provider,
    // Identifies the request together with the account (the unique key), so
    // it keeps the precision of the queue: a request made again within the
    // same second is a different request. It is never compared with times
    // from the platforms, which is what toDBString normalizes for.
    requested_at: Temporal.Instant.from(job.requestedAt).toString(),
    requested_by: job.requestedBy,
    run_id: job.runId ?? null,
    started_at: job.startedAt ? toTimestamp(job.startedAt) : null,
    status: job.status,
    talent_id: job.talentId,
  }
}

/**
 * Records a finished job in the history (`video_backfill_jobs`), which
 * outlives the job in Redis. Recording the same request twice is a no-op, so
 * this can be retried.
 */
export async function recordBackfillJob(
  supabaseClient: TypedSupabaseClient,
  job: BackfillJob,
): Promise<void> {
  const { error } = await supabaseClient
    .from('video_backfill_jobs')
    .upsert(toBackfillHistoryRow(job), {
      ignoreDuplicates: true,
      onConflict: 'platform,account_id,requested_at',
    })

  if (error) {
    throw new Error(error.message, { cause: error })
  }
}
