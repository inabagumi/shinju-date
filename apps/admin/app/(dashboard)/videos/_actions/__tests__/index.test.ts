import { describe, expect, it, vi } from 'vitest'
import { setupActionTest } from '@/test/action-harness'
import { postgresError } from '@/test/supabase'
import { restoreAction } from '../index'

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
      { id: 'video-id-1', thumbnail_id: null, title: 'Test Video' },
    ])

    const result = await restoreAction(['video-id-1'])

    expect(result).toEqual({ success: true })
    test.expectAuditLog('VIDEO_RESTORE', 'videos', 'video-id-1', {
      entityName: 'Test Video',
    })
    test.expectRevalidated({ paths: ['/videos'], tags: [['videos']] })
  })

  it('should successfully restore video with thumbnail', async () => {
    supabase.on('select', 'videos', [
      { id: 'video-id-1', thumbnail_id: 'thumb-id-1', title: 'Test Video' },
    ])

    const result = await restoreAction(['video-id-1'])

    expect(result).toEqual({ success: true })
    // Once for the select, once for the video update and once for the
    // thumbnail update
    expect(supabase.requests).toHaveLength(3)
  })

  it('should successfully restore multiple videos', async () => {
    supabase.on('select', 'videos', [
      { id: 'video-id-1', thumbnail_id: 'thumb-id-1', title: 'Test Video 1' },
      { id: 'video-id-2', thumbnail_id: null, title: 'Test Video 2' },
    ])

    const result = await restoreAction(['video-id-1', 'video-id-2'])

    expect(result).toEqual({ success: true })
    // Check that audit logs were created for both videos
    const videoIds = test.createAuditLog.mock.calls.map(
      (call: unknown[]) => call[2],
    )
    expect(videoIds).toContain('video-id-1')
    expect(videoIds).toContain('video-id-2')
  })

  it('should return error when video update fails', async () => {
    supabase.on('select', 'videos', [
      { id: 'video-id-1', thumbnail_id: null, title: 'Test Video' },
    ])
    supabase.on('update', 'videos', postgresError('XX000', 'Database error'))

    const result = await restoreAction(['video-id-1'])

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
    expect(test.logger.error).toHaveBeenCalled()
  })

  it('should return error when thumbnail update fails', async () => {
    supabase.on('select', 'videos', [
      { id: 'video-id-1', thumbnail_id: 'thumb-id-1', title: 'Test Video' },
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
