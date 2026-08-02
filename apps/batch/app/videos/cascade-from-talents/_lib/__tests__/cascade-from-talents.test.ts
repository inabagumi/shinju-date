import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cascadeVideosFromTalents } from '../cascade-from-talents'

vi.mock('@shinju-date/temporal-fns', () => ({
  toDBString: vi.fn((instant: { toString: () => string }) =>
    instant.toString(),
  ),
}))

vi.mock('temporal-polyfill', () => ({
  Temporal: {
    Now: {
      instant: vi.fn(() => ({
        toString: () => '2026-08-02T12:00:00Z',
      })),
    },
  },
}))

interface QueryResult {
  data: unknown
  error: { message: string } | null
}

interface MockCall {
  table: string
  method: string
  args: unknown[]
}

/**
 * Builds a thenable Supabase query mock that records chain calls
 * and resolves with the provided result when awaited.
 */
function createClientMock(options: {
  onSelectVideos: () => QueryResult
  onUpdateVideos?: (payload: Record<string, unknown>) => QueryResult
  onUpdateThumbnails?: (payload: Record<string, unknown>) => QueryResult
}) {
  const calls: MockCall[] = []
  let selectCount = 0

  const from = vi.fn((table: string) => {
    let pendingUpdatePayload: Record<string, unknown> | null = null
    let isUpdate = false

    const resolveResult = (): QueryResult => {
      if (table === 'videos' && !isUpdate) {
        selectCount++
        return options.onSelectVideos()
      }
      if (table === 'videos' && isUpdate) {
        return (
          options.onUpdateVideos?.(pendingUpdatePayload ?? {}) ?? {
            data: null,
            error: null,
          }
        )
      }
      if (table === 'thumbnails' && isUpdate) {
        return (
          options.onUpdateThumbnails?.(pendingUpdatePayload ?? {}) ?? {
            data: null,
            error: null,
          }
        )
      }
      return { data: null, error: null }
    }

    // Deferred thenable: resolve only when awaited so chain flags
    // (isUpdate / payload) are set first.
    const thenable = {
      // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock for Supabase query chains
      then(
        onfulfilled?: ((value: QueryResult) => unknown) | null,
        onrejected?: ((reason: unknown) => unknown) | null,
      ) {
        return Promise.resolve()
          .then(resolveResult)
          .then(onfulfilled, onrejected)
      },
    }

    const record =
      (method: string) =>
      (...args: unknown[]) => {
        calls.push({ args, method, table })
        if (method === 'update') {
          isUpdate = true
          pendingUpdatePayload = args[0] as Record<string, unknown>
        }
        return thenable
      }

    Object.assign(thenable, {
      eq: record('eq'),
      in: record('in'),
      is: record('is'),
      limit: record('limit'),
      not: record('not'),
      order: record('order'),
      select: record('select'),
      update: record('update'),
    })

    return thenable
  })

  return {
    calls,
    client: { from },
    getSelectCount: () => selectCount,
  }
}

describe('cascadeVideosFromTalents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('soft-deletes undeleted videos under deleted talents as talent_cascade', async () => {
    const videoUpdates: Record<string, unknown>[] = []
    const thumbnailUpdates: Record<string, unknown>[] = []
    let selectPhase = 0

    const { client, calls } = createClientMock({
      onSelectVideos: () => {
        selectPhase++
        if (selectPhase === 1) {
          return {
            data: [
              { id: 'video-1', thumbnail_id: 'thumb-1' },
              { id: 'video-2', thumbnail_id: null },
            ],
            error: null,
          }
        }
        // restore candidates
        return { data: [], error: null }
      },
      onUpdateThumbnails: (payload) => {
        thumbnailUpdates.push(payload)
        return { data: null, error: null }
      },
      onUpdateVideos: (payload) => {
        videoUpdates.push(payload)
        return { data: null, error: null }
      },
    })

    const result = await cascadeVideosFromTalents(client as never)

    expect(result).toEqual({ restored: 0, softDeleted: 2 })
    expect(videoUpdates).toHaveLength(1)
    expect(videoUpdates[0]).toMatchObject({
      deleted_at: '2026-08-02T12:00:00Z',
      deleted_reason: 'talent_cascade',
      updated_at: '2026-08-02T12:00:00Z',
    })
    expect(thumbnailUpdates).toHaveLength(1)
    expect(thumbnailUpdates[0]).toMatchObject({
      deleted_at: '2026-08-02T12:00:00Z',
    })

    // Soft-delete path filters on parent talent deleted_at
    expect(
      calls.some(
        (call) =>
          call.table === 'videos' &&
          call.method === 'not' &&
          call.args[0] === 'talents.deleted_at',
      ),
    ).toBe(true)
  })

  it('restores only videos marked talent_cascade under active talents', async () => {
    const videoUpdates: Record<string, unknown>[] = []
    let selectPhase = 0

    const { client, calls } = createClientMock({
      onSelectVideos: () => {
        selectPhase++
        if (selectPhase === 1) {
          return { data: [], error: null }
        }
        return {
          data: [{ id: 'cascade-video', thumbnail_id: 'thumb-c' }],
          error: null,
        }
      },
      onUpdateVideos: (payload) => {
        videoUpdates.push(payload)
        return { data: null, error: null }
      },
    })

    const result = await cascadeVideosFromTalents(client as never)

    expect(result).toEqual({ restored: 1, softDeleted: 0 })
    expect(videoUpdates).toEqual([
      {
        deleted_at: null,
        deleted_reason: null,
        updated_at: '2026-08-02T12:00:00Z',
      },
    ])

    // Restore path must filter by deleted_reason = talent_cascade
    expect(
      calls.some(
        (call) =>
          call.table === 'videos' &&
          call.method === 'eq' &&
          call.args[0] === 'deleted_reason' &&
          call.args[1] === 'talent_cascade',
      ),
    ).toBe(true)

    // Active talent: talents.deleted_at IS NULL
    expect(
      calls.some(
        (call) =>
          call.table === 'videos' &&
          call.method === 'is' &&
          call.args[0] === 'talents.deleted_at' &&
          call.args[1] === null,
      ),
    ).toBe(true)
  })

  it('returns zeros when there is nothing to process', async () => {
    const { client } = createClientMock({
      onSelectVideos: () => ({ data: [], error: null }),
    })

    const result = await cascadeVideosFromTalents(client as never)

    expect(result).toEqual({ restored: 0, softDeleted: 0 })
  })

  it('throws when select for soft-delete fails', async () => {
    const { client } = createClientMock({
      onSelectVideos: () => ({
        data: null,
        error: { message: 'db error' },
      }),
    })

    await expect(cascadeVideosFromTalents(client as never)).rejects.toThrow(
      'db error',
    )
  })

  it('soft-deletes and restores in the same run when both exist', async () => {
    const videoUpdates: Record<string, unknown>[] = []
    let selectPhase = 0

    const { client } = createClientMock({
      onSelectVideos: () => {
        selectPhase++
        if (selectPhase === 1) {
          return {
            data: [{ id: 'to-delete', thumbnail_id: null }],
            error: null,
          }
        }
        return {
          data: [{ id: 'to-restore', thumbnail_id: null }],
          error: null,
        }
      },
      onUpdateVideos: (payload) => {
        videoUpdates.push(payload)
        return { data: null, error: null }
      },
    })

    const result = await cascadeVideosFromTalents(client as never)

    expect(result).toEqual({ restored: 1, softDeleted: 1 })
    expect(videoUpdates).toHaveLength(2)
    expect(videoUpdates[0]).toMatchObject({ deleted_reason: 'talent_cascade' })
    expect(videoUpdates[1]).toMatchObject({
      deleted_at: null,
      deleted_reason: null,
    })
  })
})
