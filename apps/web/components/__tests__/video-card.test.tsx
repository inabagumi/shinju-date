import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { Video } from '@/lib/fetchers'
import VideoCard from '../video-card'

const profileImage = {
  blur_data_url: 'data:image/webp;base64,AAAA',
  id: '00000000-0000-4000-8000-000000000001',
}

function createYouTubeVideo(
  youtubeChannel: NonNullable<Video['youtube_video']>['youtube_channel'],
): Video {
  return {
    duration: 'PT10M',
    id: 'youtube-video',
    platform: 'youtube',
    published_at: '2026-11-14T11:00:00Z',
    status: 'PUBLISHED',
    talent: { id: 'talent-1', name: 'タレント名' },
    thumbnail: null,
    title: 'YouTubeの動画',
    twitch_video: null,
    video_kind: 'standard',
    youtube_video: {
      youtube_channel: youtubeChannel,
      youtube_video_id: 'YT_video1abc',
    },
  }
}

function createTwitchVideo(
  twitchUser: NonNullable<Video['twitch_video']>['twitch_user'],
): Video {
  return {
    duration: 'PT1H',
    id: 'twitch-video',
    platform: 'twitch',
    published_at: '2026-11-14T11:00:00Z',
    status: 'ENDED',
    talent: { id: 'talent-1', name: 'タレント名' },
    thumbnail: null,
    title: 'Twitchの配信',
    twitch_video: {
      twitch_user: twitchUser,
      twitch_video_id: '1234567890',
      type: 'archive',
    },
    video_kind: 'standard',
    youtube_video: null,
  }
}

function getCreator() {
  return screen.getByTestId('video-creator')
}

describe('VideoCard', () => {
  test('should show the icon and name of the YouTube channel', () => {
    render(
      <VideoCard
        value={createYouTubeVideo({
          name: 'チャンネル名',
          profile_image: profileImage,
          youtube_handle: '@channel',
        })}
      />,
    )

    const creator = getCreator()

    expect(creator).toHaveTextContent('チャンネル名')

    const icon = creator.querySelector('img')

    expect(icon).not.toBeNull()
    expect(decodeURIComponent(icon?.getAttribute('src') ?? '')).toContain(
      `/images/profile-images/${profileImage.id}`,
    )
  })

  test('should show the icon and display name of the Twitch user', () => {
    render(
      <VideoCard
        value={createTwitchVideo({
          name: 'Twitch表示名',
          profile_image: profileImage,
          twitch_login_name: 'twitch_login',
        })}
      />,
    )

    const creator = getCreator()

    expect(creator).toHaveTextContent('Twitch表示名')
    expect(creator).not.toHaveTextContent('twitch_login')
    expect(creator.querySelector('img')).not.toBeNull()
  })

  test('should show the default icon when the account has no icon', () => {
    render(
      <VideoCard
        value={createYouTubeVideo({
          name: 'チャンネル名',
          profile_image: null,
          youtube_handle: '@channel',
        })}
      />,
    )

    const creator = getCreator()

    expect(creator.querySelector('img')).toBeNull()
    expect(
      within(creator).getByTestId('video-creator-default-icon'),
    ).toHaveAttribute('aria-hidden', 'true')
    expect(creator).toHaveTextContent('チャンネル名')
  })

  test.each([
    [
      'the YouTube handle',
      createYouTubeVideo({
        name: null,
        profile_image: null,
        youtube_handle: '@channel',
      }),
      '@channel',
    ],
    [
      'the Twitch login',
      createTwitchVideo({
        name: ' ',
        profile_image: null,
        twitch_login_name: 'twitch_login',
      }),
      'twitch_login',
    ],
    [
      'the talent name for a missing YouTube channel',
      createYouTubeVideo(null),
      'タレント名',
    ],
    [
      'the talent name for a missing Twitch user',
      { ...createTwitchVideo(null), status: 'UPCOMING' } satisfies Video,
      'タレント名',
    ],
  ])('should fall back to %s', (_, video, expectedName) => {
    render(<VideoCard value={video} />)

    expect(getCreator()).toHaveTextContent(expectedName)
    expect(screen.getByRole('link')).toBeInTheDocument()
  })

  test('should still render the card without any creator data', () => {
    const video = createYouTubeVideo(null)

    render(
      <VideoCard
        value={{ ...video, talent: null as unknown as Video['talent'] }}
      />,
    )

    expect(screen.getByRole('link')).toHaveTextContent('YouTubeの動画')
    expect(screen.queryByTestId('video-creator')).not.toBeInTheDocument()
  })

  test('should not announce the creator icon or nest links in the card', () => {
    render(
      <VideoCard
        compact
        value={createYouTubeVideo({
          name: 'チャンネル名',
          profile_image: profileImage,
          youtube_handle: '@channel',
        })}
      />,
    )

    const link = screen.getByRole('link')

    // The icon is decorative (alt=""), so the name is read only once.
    expect(within(link).queryAllByRole('img')).toHaveLength(0)
    expect(link.textContent?.match(/チャンネル名/g)).toHaveLength(1)
    expect(within(link).queryAllByRole('link')).toHaveLength(0)
  })
})
