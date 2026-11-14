import type { BackfillJob } from '@shinju-date/video-backfill'
import { describe, expect, it, vi } from 'vitest'
import type { TypedSupabaseClient } from '../supabase'
import {
  recordBackfillJob,
  toBackfillHistoryRow,
} from '../video-backfill-history'

function createJob(overrides: Partial<BackfillJob> = {}): BackfillJob {
  return {
    accountId: 'channel-row-1',
    added: 12,
    attempts: 0,
    cursor: null,
    error: null,
    finishedAt: '2026-11-14T00:10:00.123Z',
    id: 'youtube:channel-row-1',
    pages: 3,
    provider: 'youtube',
    requestedAt: '2026-11-14T00:00:00.456Z',
    requestedBy: 'user-1',
    runId: 'run-1',
    startedAt: '2026-11-14T00:01:00.789Z',
    status: 'done',
    talentId: 'talent-1',
    updatedAt: '2026-11-14T00:10:00.123Z',
    ...overrides,
  }
}

function withoutRunId({ runId: _runId, ...job }: BackfillJob): BackfillJob {
  return job
}

function createSupabaseClient(error: { message: string } | null = null) {
  const upsert = vi.fn(async () => ({ error }))
  const from = vi.fn(() => ({ upsert }))

  return {
    client: { from } as unknown as TypedSupabaseClient,
    from,
    upsert,
  }
}

describe('toBackfillHistoryRow', () => {
  it('converts a finished job, with timestamps in seconds', () => {
    expect(toBackfillHistoryRow(createJob())).toEqual({
      account_id: 'channel-row-1',
      added: 12,
      error: null,
      finished_at: '2026-11-14T00:10:00Z',
      pages: 3,
      platform: 'youtube',
      requested_at: '2026-11-14T00:00:00Z',
      requested_by: 'user-1',
      run_id: 'run-1',
      started_at: '2026-11-14T00:01:00Z',
      status: 'done',
      talent_id: 'talent-1',
    })
  })

  it('keeps why a job failed', () => {
    expect(
      toBackfillHistoryRow({
        // Jobs queued before checks of all accounts existed have no runId.
        ...withoutRunId(createJob()),
        error: 'quota exceeded',
        provider: 'twitch',
        startedAt: null,
        status: 'failed',
      }),
    ).toEqual(
      expect.objectContaining({
        error: 'quota exceeded',
        platform: 'twitch',
        run_id: null,
        started_at: null,
        status: 'failed',
      }),
    )
  })

  it.each(['pending', 'running'] as const)(
    'rejects a job that is %s',
    (status) => {
      expect(() =>
        toBackfillHistoryRow(createJob({ finishedAt: null, status })),
      ).toThrow(TypeError)
    },
  )
})

describe('recordBackfillJob', () => {
  it('records a request once', async () => {
    const { client, from, upsert } = createSupabaseClient()

    await recordBackfillJob(client, createJob())

    expect(from).toHaveBeenCalledWith('video_backfill_jobs')
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ account_id: 'channel-row-1', status: 'done' }),
      {
        ignoreDuplicates: true,
        onConflict: 'platform,account_id,requested_at',
      },
    )
  })

  it('throws when the row cannot be saved', async () => {
    const { client } = createSupabaseClient({ message: 'permission denied' })

    await expect(recordBackfillJob(client, createJob())).rejects.toThrow(
      'permission denied',
    )
  })
})
