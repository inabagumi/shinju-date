import { describe, expect, it, vi } from 'vitest'
import { restoreAction } from '../index'

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@shinju-date/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

vi.mock('@/lib/audit-log', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@shinju-date/web-cache', () => ({
  revalidateTags: vi.fn(),
}))

vi.mock('@shinju-date/temporal-fns', () => ({
  toDBString: vi.fn((instant) => instant.toString()),
}))

vi.mock('temporal-polyfill', () => ({
  Temporal: {
    Now: {
      instant: vi.fn(() => ({
        toString: () => '2024-11-24T17:00:00Z',
      })),
    },
  },
}))

describe('restoreAction', () => {
  it('should return error when ids array is empty', async () => {
    const result = await restoreAction([])

    expect(result).toEqual({
      error: '動画が選択されていません。',
      success: false,
    })
  })

  it('should return error when videos are not found', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')

    const mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const result = await restoreAction(['video-id-1'])

    expect(result).toEqual({
      error: '動画が見つかりませんでした。',
      success: false,
    })
  })

  it('should successfully restore single video without thumbnail', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { revalidatePath } = await import('next/cache')
    const { revalidateTags } = await import('@shinju-date/web-cache')

    const mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      // biome-ignore lint/suspicious/noExplicitAny: Testing requires dynamic context binding
      in: vi.fn().mockImplementation(function (this: any) {
        // For select().in() - return video data
        if (this.selectCalled) {
          return Promise.resolve({
            data: [
              { id: 'video-id-1', thumbnail_id: null, title: 'Test Video' },
            ],
            error: null,
          })
        }
        // For update().in() - return this for chaining
        return this
      }),
      select: vi.fn().mockReturnThis(),
      // biome-ignore lint/suspicious/noExplicitAny: Testing requires dynamic context binding
      update: vi.fn().mockImplementation(function (this: any) {
        this.updateCalled = true
        return this
      }),
    }

    // Track when select is called
    // biome-ignore lint/suspicious/noExplicitAny: Testing requires dynamic context binding
    mockSupabaseClient.select.mockImplementation(function (this: any) {
      this.selectCalled = true
      return this
    })

    // When in() is called after update, resolve with success
    const inSpy = vi.spyOn(mockSupabaseClient, 'in')
    // biome-ignore lint/suspicious/noExplicitAny: Testing requires dynamic context binding
    inSpy.mockImplementation(function (this: any) {
      if (this.updateCalled) {
        return Promise.resolve({ data: null, error: null })
      }
      return Promise.resolve({
        data: [{ id: 'video-id-1', thumbnail_id: null, title: 'Test Video' }],
        error: null,
      })
    })

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const result = await restoreAction(['video-id-1'])

    expect(result).toEqual({ success: true })
    expect(createAuditLog).toHaveBeenCalledWith(
      'VIDEO_RESTORE',
      'videos',
      'video-id-1',
      { entityName: 'Test Video' },
    )
    expect(revalidatePath).toHaveBeenCalledWith('/videos')
    expect(revalidateTags).toHaveBeenCalledWith(['videos'])
  })

  it('should successfully restore video with thumbnail', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')

    let callCount = 0
    const mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      in: vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // First call: select videos
          return Promise.resolve({
            data: [
              {
                id: 'video-id-1',
                thumbnail_id: 'thumb-id-1',
                title: 'Test Video',
              },
            ],
            error: null,
          })
        }
        // Subsequent calls: update operations
        return Promise.resolve({ data: null, error: null })
      }),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const result = await restoreAction(['video-id-1'])

    expect(result).toEqual({ success: true })
    // Should call in() three times: once for select, once for video update, once for thumbnail update
    expect(mockSupabaseClient.in).toHaveBeenCalledTimes(3)
  })

  it('should successfully restore multiple videos', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { createAuditLog } = await import('@/lib/audit-log')

    let callCount = 0
    const mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      in: vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // First call: select videos
          return Promise.resolve({
            data: [
              {
                id: 'video-id-1',
                thumbnail_id: 'thumb-id-1',
                title: 'Test Video 1',
              },
              {
                id: 'video-id-2',
                thumbnail_id: null,
                title: 'Test Video 2',
              },
            ],
            error: null,
          })
        }
        // Subsequent calls: update operations
        return Promise.resolve({ data: null, error: null })
      }),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const result = await restoreAction(['video-id-1', 'video-id-2'])

    expect(result).toEqual({ success: true })
    // Check that audit logs were created for both videos (at least 2 times)
    expect(createAuditLog).toHaveBeenCalled()
    const auditLogCalls = vi.mocked(createAuditLog).mock.calls
    const videoIds = auditLogCalls.map((call) => call[2])
    expect(videoIds).toContain('video-id-1')
    expect(videoIds).toContain('video-id-2')
  })

  it('should return error when video update fails', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { logger } = await import('@shinju-date/logger')

    let callCount = 0
    const mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      in: vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // First call: select videos
          return Promise.resolve({
            data: [
              { id: 'video-id-1', thumbnail_id: null, title: 'Test Video' },
            ],
            error: null,
          })
        }
        // Second call: update fails
        return Promise.resolve({
          data: null,
          error: { message: 'Database error' },
        })
      }),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const result = await restoreAction(['video-id-1'])

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
    expect(logger.error).toHaveBeenCalled()
  })

  it('should return error when thumbnail update fails', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')

    let callCount = 0
    const mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      in: vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // First call: select videos
          return Promise.resolve({
            data: [
              {
                id: 'video-id-1',
                thumbnail_id: 'thumb-id-1',
                title: 'Test Video',
              },
            ],
            error: null,
          })
        }
        if (callCount === 2) {
          // Second call: video update succeeds
          return Promise.resolve({ data: null, error: null })
        }
        // Third call: thumbnail update fails
        return Promise.resolve({
          data: null,
          error: { message: 'Thumbnail update failed' },
        })
      }),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const result = await restoreAction(['video-id-1'])

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('should handle fetch error', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')

    const mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Fetch error' },
      }),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const result = await restoreAction(['video-id-1'])

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })
})
