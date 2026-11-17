import { CACHE_TAGS } from '@shinju-date/constants'
import type { RefreshVideoResult } from '@shinju-date/scraper'
import { toDBString } from '@shinju-date/temporal-fns'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupActionTest } from '@/test/action-harness'
import { syncVideoAction } from '../sync'

const scraper = vi.hoisted(() => ({
  createScraper: vi.fn(),
  refreshVideo: vi.fn(),
}))

vi.mock('@/lib/scraper', () => ({ createScraper: scraper.createScraper }))

const test = setupActionTest()
const { supabase } = test

const now = Temporal.Instant.from('2024-11-24T17:00:00Z')

vi.spyOn(Temporal.Now, 'instant').mockReturnValue(now)

const videoId = '30000000-0000-0000-0000-000000000101'

function saveVideo(platform: 'twitch' | 'youtube' = 'youtube') {
  supabase.on('select', 'videos', [{ platform, title: 'Saved Title' }])
}

function refreshTo(result: RefreshVideoResult) {
  scraper.refreshVideo.mockResolvedValue(result)
}

const revalidated = {
  paths: [`/videos/${videoId}`, '/videos'],
  tags: [[CACHE_TAGS.VIDEOS]],
}

beforeEach(() => {
  scraper.createScraper.mockReturnValue({
    refreshVideo: scraper.refreshVideo,
  })
})

describe('syncVideoAction', () => {
  it.each(['youtube', 'twitch'] as const)(
    'refreshes a %s video with the scraper of its platform',
    async (platform) => {
      saveVideo(platform)
      refreshTo({ status: 'unchanged', title: 'Saved Title' })

      await syncVideoAction(videoId)

      expect(scraper.createScraper).toHaveBeenCalledWith(platform)
      expect(scraper.refreshVideo).toHaveBeenCalledWith(videoId, now)
    },
  )

  it('records the changed columns and revalidates when the video was updated', async () => {
    saveVideo()
    refreshTo({
      after: { title: 'New Title', video_kind: 'short' },
      before: { title: 'Saved Title', video_kind: 'standard' },
      status: 'updated',
      title: 'New Title',
    })

    const result = await syncVideoAction(videoId)

    expect(result).toEqual({
      message: '動画情報を同期しました。',
      success: true,
    })
    test.expectAuditLog('VIDEO_SYNC', videoId, {
      changes: {
        after: { title: 'New Title', video_kind: 'short' },
        before: { title: 'Saved Title', video_kind: 'standard' },
      },
      entityName: 'New Title',
    })
    test.expectRevalidated(revalidated)
  })

  it('reports an up-to-date video without recording or revalidating', async () => {
    saveVideo()
    refreshTo({ status: 'unchanged', title: 'Saved Title' })

    const result = await syncVideoAction(videoId)

    expect(result).toEqual({
      message: '動画情報は既に最新です。',
      success: true,
      unchanged: true,
    })
    test.expectNoAuditLog()
    test.expectNotRevalidated()
  })

  it.each([
    ['youtube', 'YouTube'],
    ['twitch', 'Twitch'],
  ] as const)(
    'records the soft deletion of a %s video the platform no longer returns',
    async (platform, label) => {
      saveVideo(platform)
      refreshTo({ status: 'unavailable' })

      const result = await syncVideoAction(videoId)

      expect(result).toEqual({
        message: `${label}で動画が見つからなかったため、動画を削除しました。`,
        success: true,
      })
      test.expectAuditLog('VIDEO_SYNC', videoId, {
        changes: {
          after: {
            deleted_at: toDBString(now),
            deleted_reason: 'unavailable',
          },
          before: { deleted_at: null },
        },
        entityName: 'Saved Title',
      })
      test.expectRevalidated(revalidated)
    },
  )

  it('reports a video the scraper did not find', async () => {
    saveVideo()
    refreshTo({ status: 'not-found' })

    const result = await syncVideoAction(videoId)

    expect(result).toEqual({
      error: '動画が見つかりませんでした。',
      success: false,
    })
    test.expectNoAuditLog()
    test.expectNotRevalidated()
  })

  it('reports a video that is not saved without calling the scraper', async () => {
    supabase.on('select', 'videos', [])

    const result = await syncVideoAction(videoId)

    expect(result).toEqual({
      error: '動画が見つかりませんでした。',
      success: false,
    })
    expect(scraper.createScraper).not.toHaveBeenCalled()
    test.expectNoAuditLog()
    test.expectNotRevalidated()
  })

  it('reports a failure of the scraper', async () => {
    saveVideo()
    scraper.refreshVideo.mockRejectedValue(new Error('YouTube is down'))

    const result = await syncVideoAction(videoId)

    expect(result).toEqual({ error: 'YouTube is down', success: false })
    expect(test.logger.error).toHaveBeenCalledWith(
      '動画の同期に失敗しました',
      expect.objectContaining({ videoId }),
    )
    test.expectNoAuditLog()
    test.expectNotRevalidated()
  })
})
