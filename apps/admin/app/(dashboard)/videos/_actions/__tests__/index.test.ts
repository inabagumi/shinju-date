import { beforeEach, describe, expect, it, vi } from 'vitest'
import { restoreAction, toggleVisibilityAction } from '../index'

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  createSupabaseServerClient: vi.fn(),
}))

// Server Action の認証ガードを通過させ、各テストでモックした Supabase クライアントを渡す
vi.mock('@/lib/auth', async (importOriginal) => {
  const { createSupabaseServerClient } = await import('@/lib/supabase')

  return {
    ...(await importOriginal<typeof import('@/lib/auth')>()),
    requireAuthenticatedUser: vi.fn(async () => ({
      supabaseClient: await createSupabaseServerClient(),
      user: { id: 'test-user-id' },
    })),
  }
})

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

vi.spyOn(Temporal.Now, 'instant').mockReturnValue(
  Temporal.Instant.from('2024-11-24T17:00:00Z'),
)

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

interface ToggleVideo {
  id: string
  title: string
  visible: boolean
}

interface UpdateCall {
  eq: [string, unknown][]
  ids: string[]
  values: Record<string, unknown>
}

interface ToggleMockOptions {
  /** 指定した切り替え先の UPDATE をエラーにする */
  failVisible?: boolean
  /** UPDATE の前にほかの操作で切り替わった動画の ID */
  changedIds?: string[]
}

/**
 * 読み取りの SELECT と、切り替え先ごとの UPDATE を模擬する Supabase クライアントを作る。
 */
function createToggleSupabaseMock(
  videos: ToggleVideo[],
  { changedIds = [], failVisible }: ToggleMockOptions = {},
) {
  const updateCalls: UpdateCall[] = []

  const from = vi.fn(() => {
    let call: UpdateCall | undefined

    const builder = {
      eq: vi.fn((column: string, value: unknown) => {
        call?.eq.push([column, value])
        return builder
      }),
      in: vi.fn((_column: string, ids: string[]) => {
        if (!call) {
          return Promise.resolve({
            data: videos.filter((video) => ids.includes(video.id)),
            error: null,
          })
        }

        call.ids = ids
        return builder
      }),
      select: vi.fn(() => {
        if (!call) {
          return builder
        }

        const { values } = call

        if (values['visible'] === failVisible) {
          return Promise.resolve({
            data: null,
            error: { message: 'Database error' },
          })
        }

        const [, expectedVisible] =
          call.eq.find(([column]) => column === 'visible') ?? []

        return Promise.resolve({
          data: videos
            .filter(
              (video) =>
                call?.ids.includes(video.id) &&
                !changedIds.includes(video.id) &&
                video.visible === expectedVisible,
            )
            .map(({ id, title }) => ({ id, title })),
          error: null,
        })
      }),
      update: vi.fn((values: Record<string, unknown>) => {
        call = { eq: [], ids: [], values }
        updateCalls.push(call)
        return builder
      }),
    }

    return builder
  })

  return { client: { from }, updateCalls }
}

describe('toggleVisibilityAction', () => {
  const videos: ToggleVideo[] = [
    { id: 'video-id-1', title: 'Hidden Video', visible: false },
    { id: 'video-id-2', title: 'Visible Video 1', visible: true },
    { id: 'video-id-3', title: 'Visible Video 2', visible: true },
  ]
  const ids = videos.map((video) => video.id)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function useSupabaseMock(options?: ToggleMockOptions) {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const mock = createToggleSupabaseMock(videos, options)

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mock.client as never,
    )

    return mock
  }

  it('should return error when ids array is empty', async () => {
    const result = await toggleVisibilityAction([])

    expect(result).toEqual({
      error: '動画が選択されていません。',
      success: false,
    })
  })

  it('should update videos in one query per target visibility', async () => {
    const { createAuditLog } = await import('@/lib/audit-log')
    const { revalidatePath } = await import('next/cache')
    const { revalidateTags } = await import('@shinju-date/web-cache')
    const { updateCalls } = await useSupabaseMock()

    const result = await toggleVisibilityAction(ids)

    expect(result).toEqual({ success: true, updatedCount: 3 })
    expect(updateCalls).toEqual([
      {
        eq: [['visible', false]],
        ids: ['video-id-1'],
        values: { updated_at: '2024-11-24T17:00:00Z', visible: true },
      },
      {
        eq: [['visible', true]],
        ids: ['video-id-2', 'video-id-3'],
        values: { updated_at: '2024-11-24T17:00:00Z', visible: false },
      },
    ])
    expect(createAuditLog).toHaveBeenCalledTimes(3)
    for (const video of videos) {
      expect(createAuditLog).toHaveBeenCalledWith(
        'VIDEO_VISIBILITY_TOGGLE',
        'videos',
        video.id,
        { entityName: video.title },
      )
      expect(revalidatePath).toHaveBeenCalledWith(`/videos/${video.id}`)
    }
    expect(revalidatePath).toHaveBeenCalledWith('/videos')
    expect(revalidateTags).toHaveBeenCalledWith(['videos'])
  })

  it('should log and revalidate updated videos when one update fails', async () => {
    const { createAuditLog } = await import('@/lib/audit-log')
    const { revalidatePath } = await import('next/cache')
    const { revalidateTags } = await import('@shinju-date/web-cache')
    const { logger } = await import('@shinju-date/logger')
    await useSupabaseMock({ failVisible: true })

    const result = await toggleVisibilityAction(ids)

    expect(result).toEqual({
      error: '2 件を更新し、1 件は失敗しました。',
      success: false,
      updatedCount: 2,
    })
    expect(createAuditLog).toHaveBeenCalledTimes(2)
    expect(createAuditLog).not.toHaveBeenCalledWith(
      'VIDEO_VISIBILITY_TOGGLE',
      'videos',
      'video-id-1',
      expect.anything(),
    )
    expect(revalidatePath).toHaveBeenCalledWith('/videos')
    expect(revalidatePath).toHaveBeenCalledWith('/videos/video-id-2')
    expect(revalidatePath).toHaveBeenCalledWith('/videos/video-id-3')
    expect(revalidatePath).not.toHaveBeenCalledWith('/videos/video-id-1')
    expect(revalidateTags).toHaveBeenCalledWith(['videos'])
    expect(logger.error).toHaveBeenCalledWith('動画の表示切替に失敗しました', {
      error: { message: 'Database error' },
      ids: 'video-id-1',
    })
  })

  it('should not log or revalidate when no video is updated', async () => {
    const { createAuditLog } = await import('@/lib/audit-log')
    const { revalidatePath } = await import('next/cache')
    const { revalidateTags } = await import('@shinju-date/web-cache')
    await useSupabaseMock({ changedIds: ['video-id-1'], failVisible: false })

    const result = await toggleVisibilityAction(ids)

    expect(result).toEqual({
      error: '動画の表示状態を更新できませんでした。',
      success: false,
      updatedCount: 0,
    })
    expect(createAuditLog).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
    expect(revalidateTags).not.toHaveBeenCalled()
  })

  it('should skip videos changed by another operation after reading', async () => {
    const { createAuditLog } = await import('@/lib/audit-log')
    await useSupabaseMock({ changedIds: ['video-id-2'] })

    const result = await toggleVisibilityAction(ids)

    expect(result).toEqual({
      error: '2 件を更新し、1 件は失敗しました。',
      success: false,
      updatedCount: 2,
    })
    expect(createAuditLog).toHaveBeenCalledTimes(2)
    expect(createAuditLog).not.toHaveBeenCalledWith(
      'VIDEO_VISIBILITY_TOGGLE',
      'videos',
      'video-id-2',
      expect.anything(),
    )
  })
})
