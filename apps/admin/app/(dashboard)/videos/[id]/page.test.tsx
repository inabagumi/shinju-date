import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findSuspenseChildren, runServerComponent } from '@/test/suspense'

const mocks = vi.hoisted(() => ({
  getVideo: vi.fn(),
}))

vi.mock('../_lib/get-video', () => ({
  default: mocks.getVideo,
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

const { default: VideoDetailPage, generateMetadata } = await import('./page')

const VIDEO_ID = '123e4567-e89b-12d3-a456-426614174000'

const video = {
  clicks: 0,
  created_at: '2026-11-01T00:00:00Z',
  deleted_at: null,
  duration: 'PT1H',
  id: VIDEO_ID,
  platform: 'youtube',
  published_at: '2026-11-01T00:00:00Z',
  status: 'ENDED',
  talent: null,
  thumbnail: null,
  title: 'テストの動画',
  twitch_video: null,
  updated_at: '2026-11-01T00:00:00Z',
  video_kind: 'standard',
  visible: true,
  youtube_video: { youtube_video_id: 'abc123' },
}

describe('VideoDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getVideo.mockResolvedValue(video)
  })

  it('fetches the title and the body with the same cached call', async () => {
    const params = Promise.resolve({ id: VIDEO_ID })

    await expect(generateMetadata({ params })).resolves.toEqual({
      title: 'テストの動画 - 動画詳細',
    })

    const details = findSuspenseChildren(
      VideoDetailPage({ params, searchParams: Promise.resolve({}) }),
    )
    await runServerComponent(details)

    // `getVideo` is a `'use cache: private'` function, so the calls with the
    // same arguments share one entry and query the database once per request.
    expect(mocks.getVideo.mock.calls).toEqual([[VIDEO_ID], [VIDEO_ID]])
  })

  it('names the page as not found when the video does not exist', async () => {
    mocks.getVideo.mockResolvedValue(null)

    await expect(
      generateMetadata({ params: Promise.resolve({ id: VIDEO_ID }) }),
    ).resolves.toEqual({ title: '動画が見つかりません' })
  })
})
