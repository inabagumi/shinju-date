import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PopularVideo } from '@/lib/analytics/get-popular-videos'

const mocks = vi.hoisted(() => ({
  getPopularVideos: vi.fn(),
}))

vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
}))
vi.mock('@/lib/analytics/get-popular-videos', () => ({
  getPopularVideos: mocks.getPopularVideos,
}))

const { DashboardPopularVideos } = await import('../dashboard-popular-videos')

function popularVideo(
  video: Pick<
    PopularVideo,
    'id' | 'platform' | 'title' | 'twitch_video' | 'youtube_video'
  >,
): PopularVideo {
  return {
    clicks: 10,
    status: 'ENDED',
    thumbnail: null,
    ...video,
  }
}

describe('DashboardPopularVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('links a Twitch video to Twitch and a YouTube video to YouTube', async () => {
    mocks.getPopularVideos.mockResolvedValue([
      popularVideo({
        id: 'twitch',
        platform: 'twitch',
        title: 'Twitch の配信',
        twitch_video: {
          twitch_user: { twitch_login_name: 'example' },
          twitch_video_id: '2000000001',
          type: 'archive',
        },
        youtube_video: null,
      }),
      popularVideo({
        id: 'youtube',
        platform: 'youtube',
        title: 'YouTube の配信',
        twitch_video: null,
        youtube_video: { youtube_video_id: 'abc123' },
      }),
    ])

    render(await DashboardPopularVideos())

    expect(screen.getByRole('link', { name: 'Twitchで視聴' })).toHaveAttribute(
      'href',
      'https://www.twitch.tv/videos/2000000001',
    )
    expect(screen.getByRole('link', { name: 'YouTubeで視聴' })).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=abc123',
    )
  })

  it('does not link a video without an ID to the outside', async () => {
    mocks.getPopularVideos.mockResolvedValue([
      popularVideo({
        id: 'no-id',
        platform: 'twitch',
        title: 'ID のない動画',
        twitch_video: null,
        youtube_video: null,
      }),
    ])

    render(await DashboardPopularVideos())

    expect(screen.getByText('ID のない動画')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '詳細' })).toHaveAttribute(
      'href',
      '/videos/no-id',
    )
    expect(
      screen.queryByRole('link', { name: /で視聴$/ }),
    ).not.toBeInTheDocument()
  })
})
