import { describe, expect, it, vi } from 'vitest'
import { setupActionTest } from '@/test/action-harness'
import { createVideo } from '@/test/factories'
import { postgresError, type SupabaseRequest } from '@/test/supabase'
import {
  restoreAction,
  softDeleteAction,
  toggleVisibilityAction,
} from './index'

const test = setupActionTest()
const { supabase } = test

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
    supabase.on('select', 'videos', [])

    const result = await restoreAction(['video-id-1'])

    expect(result).toEqual({
      error: '動画が見つかりませんでした。',
      success: false,
    })
  })

  it('should successfully restore single video without thumbnail', async () => {
    supabase.on('select', 'videos', [
      createVideo({
        id: 'video-id-1',
        thumbnail_id: null,
        title: 'Test Video',
      }),
    ])

    const result = await restoreAction(['video-id-1'])

    expect(result).toEqual({ success: true })
    test.expectAuditLogs([
      {
        action: 'VIDEO_RESTORE',
        details: { entityName: 'Test Video' },
        targetRecordId: 'video-id-1',
      },
    ])
    test.expectRevalidated({ paths: ['/videos'], tags: [['videos']] })
  })

  it('should successfully restore video with thumbnail', async () => {
    supabase.on('select', 'videos', [
      createVideo({
        id: 'video-id-1',
        thumbnail_id: 'thumb-id-1',
        title: 'Test Video',
      }),
    ])

    const result = await restoreAction(['video-id-1'])

    expect(result).toEqual({ success: true })
    // Once for the select, once for the video update and once for the
    // thumbnail update
    expect(supabase.requests).toHaveLength(3)
  })

  it('should successfully restore multiple videos', async () => {
    supabase.on('select', 'videos', [
      createVideo({
        id: 'video-id-1',
        thumbnail_id: 'thumb-id-1',
        title: 'Test Video 1',
      }),
      createVideo({
        id: 'video-id-2',
        thumbnail_id: null,
        title: 'Test Video 2',
      }),
    ])

    const result = await restoreAction(['video-id-1', 'video-id-2'])

    expect(result).toEqual({ success: true })
    // Both videos are recorded with one call
    test.expectAuditLogs([
      {
        action: 'VIDEO_RESTORE',
        details: { entityName: 'Test Video 1' },
        targetRecordId: 'video-id-1',
      },
      {
        action: 'VIDEO_RESTORE',
        details: { entityName: 'Test Video 2' },
        targetRecordId: 'video-id-2',
      },
    ])
  })

  it('should return error when video update fails', async () => {
    supabase.on('select', 'videos', [
      createVideo({
        id: 'video-id-1',
        thumbnail_id: null,
        title: 'Test Video',
      }),
    ])
    supabase.on('update', 'videos', postgresError('XX000', 'Database error'))

    const result = await restoreAction(['video-id-1'])

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
    expect(test.logger.error).toHaveBeenCalled()
  })

  it('should return error when thumbnail update fails', async () => {
    supabase.on('select', 'videos', [
      createVideo({
        id: 'video-id-1',
        thumbnail_id: 'thumb-id-1',
        title: 'Test Video',
      }),
    ])
    supabase.on(
      'update',
      'thumbnails',
      postgresError('XX000', 'Thumbnail update failed'),
    )

    const result = await restoreAction(['video-id-1'])

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('should handle fetch error', async () => {
    supabase.on('select', 'videos', postgresError('XX000', 'Fetch error'))

    const result = await restoreAction(['video-id-1'])

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })
})

describe('softDeleteAction', () => {
  it('should record the audit logs of all videos with one call', async () => {
    supabase.on('select', 'videos', [
      createVideo({ id: 'video-id-1', thumbnail_id: null, title: 'Video 1' }),
      createVideo({ id: 'video-id-2', thumbnail_id: null, title: 'Video 2' }),
    ])

    const result = await softDeleteAction(['video-id-1', 'video-id-2'])

    expect(result).toEqual({ success: true })
    test.expectAuditLogs([
      {
        action: 'VIDEO_DELETE',
        details: { entityName: 'Video 1' },
        targetRecordId: 'video-id-1',
      },
      {
        action: 'VIDEO_DELETE',
        details: { entityName: 'Video 2' },
        targetRecordId: 'video-id-2',
      },
    ])
    test.expectRevalidated({ paths: ['/videos'], tags: [['videos']] })
  })

  it('should not record audit logs when the update fails', async () => {
    supabase.on('select', 'videos', [
      createVideo({ id: 'video-id-1', thumbnail_id: null }),
    ])
    supabase.on('update', 'videos', postgresError('XX000', 'Database error'))

    const result = await softDeleteAction(['video-id-1'])

    expect(result.success).toBe(false)
    test.expectNoAuditLog()
  })
})

describe('toggleVisibilityAction', () => {
  const videos = [
    createVideo({ id: 'video-id-1', title: 'Hidden Video', visible: false }),
    createVideo({ id: 'video-id-2', title: 'Visible Video 1', visible: true }),
    createVideo({ id: 'video-id-3', title: 'Visible Video 2', visible: true }),
  ]
  const ids = videos.map((video) => video.id)

  interface UpdateOptions {
    /** UPDATE の前にほかの操作で切り替わった動画の ID */
    changedIds?: string[]
  }

  /**
   * PostgREST と同じく、`id=in.(...)` と `visible=eq.*` の両方に合う行を
   * 更新したものとして返す。
   */
  function updatedRows(
    request: SupabaseRequest,
    { changedIds = [] }: UpdateOptions = {},
  ) {
    const targetIds = (request.query['id'] ?? '')
      .replace(/^in\.\(|\)$/g, '')
      .split(',')
    const currentVisible = request.query['visible'] === 'eq.true'

    return videos
      .filter(
        (video) =>
          targetIds.includes(video.id) &&
          !changedIds.includes(video.id) &&
          video.visible === currentVisible,
      )
      .map(({ id, title }) => ({ id, title }))
  }

  it('should return error when ids array is empty', async () => {
    const result = await toggleVisibilityAction([])

    expect(result).toEqual({
      error: '動画が選択されていません。',
      success: false,
    })
  })

  it('should update videos in one query per target visibility', async () => {
    supabase.on('select', 'videos', videos)
    supabase.on('update', 'videos', (request: SupabaseRequest) =>
      updatedRows(request),
    )

    const result = await toggleVisibilityAction(ids)

    expect(result).toEqual({ success: true, updatedCount: 3 })
    expect(
      supabase.calls('update', 'videos').map(({ body, query }) => ({
        body,
        id: query['id'],
        visible: query['visible'],
      })),
    ).toEqual([
      {
        body: { updated_at: '2024-11-24T17:00:00Z', visible: true },
        id: 'in.(video-id-1)',
        visible: 'eq.false',
      },
      {
        body: { updated_at: '2024-11-24T17:00:00Z', visible: false },
        id: 'in.(video-id-2,video-id-3)',
        visible: 'eq.true',
      },
    ])
    test.expectAuditLogs(
      videos.map((video) => ({
        action: 'VIDEO_VISIBILITY_TOGGLE',
        details: { entityName: video.title },
        targetRecordId: video.id,
      })),
    )
    test.expectRevalidated({
      paths: ['/videos', ...ids.map((id) => `/videos/${id}`)],
      tags: [['videos']],
    })
  })

  it('should log and revalidate updated videos when one update fails', async () => {
    supabase.on('select', 'videos', videos)
    supabase.on('update', 'videos', (request: SupabaseRequest) =>
      request.query['visible'] === 'eq.false'
        ? postgresError('XX000', 'Database error')
        : updatedRows(request),
    )

    const result = await toggleVisibilityAction(ids)

    expect(result).toEqual({
      error: '2 件を更新し、1 件は失敗しました。',
      success: false,
      updatedCount: 2,
    })
    test.expectAuditLogs([
      {
        action: 'VIDEO_VISIBILITY_TOGGLE',
        details: { entityName: 'Visible Video 1' },
        targetRecordId: 'video-id-2',
      },
      {
        action: 'VIDEO_VISIBILITY_TOGGLE',
        details: { entityName: 'Visible Video 2' },
        targetRecordId: 'video-id-3',
      },
    ])
    test.expectRevalidated({
      paths: ['/videos', '/videos/video-id-2', '/videos/video-id-3'],
      tags: [['videos']],
    })
    expect(test.revalidatePath).not.toHaveBeenCalledWith('/videos/video-id-1')
    expect(test.logger.error).toHaveBeenCalledWith(
      '動画の表示切替に失敗しました',
      expect.objectContaining({ ids: 'video-id-1' }),
    )
  })

  it('should not log or revalidate when no video is updated', async () => {
    supabase.on('select', 'videos', videos)
    supabase.on('update', 'videos', (request: SupabaseRequest) =>
      request.query['visible'] === 'eq.true'
        ? postgresError('XX000', 'Database error')
        : updatedRows(request, { changedIds: ['video-id-1'] }),
    )

    const result = await toggleVisibilityAction(ids)

    expect(result).toEqual({
      error: '動画の表示状態を更新できませんでした。',
      success: false,
      updatedCount: 0,
    })
    test.expectNoAuditLog()
    test.expectNotRevalidated()
  })

  it('should skip videos changed by another operation after reading', async () => {
    supabase.on('select', 'videos', videos)
    supabase.on('update', 'videos', (request: SupabaseRequest) =>
      updatedRows(request, { changedIds: ['video-id-2'] }),
    )

    const result = await toggleVisibilityAction(ids)

    expect(result).toEqual({
      error: '2 件を更新し、1 件は失敗しました。',
      success: false,
      updatedCount: 2,
    })
    test.expectAuditLogs([
      {
        action: 'VIDEO_VISIBILITY_TOGGLE',
        details: { entityName: 'Hidden Video' },
        targetRecordId: 'video-id-1',
      },
      {
        action: 'VIDEO_VISIBILITY_TOGGLE',
        details: { entityName: 'Visible Video 2' },
        targetRecordId: 'video-id-3',
      },
    ])
  })
})
