import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { Video } from '@/lib/fetchers'
import VideoCard, { VideoCardSkeleton } from '../video-card'

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

  test('should wrap the title at word boundaries when possible', () => {
    render(<VideoCard value={createYouTubeVideo(null)} />)

    // `break-all` splits words such as "#shorts" in the middle.
    const title = screen.getByRole('heading')

    expect(title).toHaveClass('wrap-anywhere')
    expect(title).not.toHaveClass('break-all')
  })

  test('should truncate a long creator name and keep the full name in the title', () => {
    const longName = 'とても長いチャンネル名'.repeat(10)

    render(
      <VideoCard
        value={createYouTubeVideo({
          name: longName,
          profile_image: profileImage,
          youtube_handle: '@channel',
        })}
      />,
    )

    const name = within(getCreator()).getByTitle(longName)

    expect(name).toHaveClass('truncate')
    expect(getCreator()).toHaveClass('min-w-0')
  })

  test('should keep the height of two lines for the title', () => {
    render(<VideoCard value={createYouTubeVideo(null)} />)

    const title = screen.getByRole('heading')

    expect(title).toHaveClass('line-clamp-2', 'min-h-[2lh]')
  })

  test('should show the creator and the date in one line', () => {
    render(
      <VideoCard
        value={createYouTubeVideo({
          name: 'チャンネル名',
          profile_image: null,
          youtube_handle: '@channel',
        })}
      />,
    )

    const meta = getCreator().parentElement

    if (!meta) {
      throw new Error('The creator is not in the meta line')
    }

    expect(meta).toHaveClass('text-meta', 'text-muted')
    expect(meta.textContent).toBe('チャンネル名・20:00')
    expect(within(meta).getByText('・')).toHaveAttribute('aria-hidden', 'true')
  })

  test('should hide the date below 640px when it is shown outside the card', () => {
    render(
      <VideoCard
        hideTimeOnMobile
        value={createYouTubeVideo({
          name: 'チャンネル名',
          profile_image: null,
          youtube_handle: '@channel',
        })}
      />,
    )

    expect(screen.getByText('・')).toHaveClass('max-sm:hidden')
    expect(screen.getByText('20:00')).toHaveClass('max-sm:hidden')
  })

  test('should use the given heading level for the title', () => {
    render(<VideoCard titleAs="h4" value={createYouTubeVideo(null)} />)

    expect(
      screen.getByRole('heading', { level: 4, name: 'YouTubeの動画' }),
    ).toBeInTheDocument()
  })

  test('should not show the separator without a creator', () => {
    const video = createYouTubeVideo(null)

    render(
      <VideoCard
        value={{ ...video, talent: null as unknown as Video['talent'] }}
      />,
    )

    expect(screen.queryByText('・')).not.toBeInTheDocument()
  })

  test('should show the duration on the thumbnail', () => {
    render(<VideoCard value={createYouTubeVideo(null)} />)

    const duration = within(
      screen.getByTestId('video-card-thumbnail'),
    ).getByText('10:00')

    expect(duration).toHaveAttribute('dateTime', 'PT10M')
    expect(duration.parentElement).toHaveClass('right-0', 'bottom-0')
  })

  test('should show the live badge only for live videos', () => {
    const video = createYouTubeVideo(null)
    const { rerender } = render(<VideoCard value={video} />)

    expect(screen.queryByText('配信中')).not.toBeInTheDocument()

    rerender(<VideoCard value={{ ...video, status: 'LIVE' }} />)

    const badge = within(screen.getByTestId('video-card-thumbnail')).getByText(
      '配信中',
    )

    expect(badge).toHaveClass('top-0', 'left-0', 'bg-live')
  })

  test.each([
    ['Twitch', createTwitchVideo(null), true],
    ['YouTube', createYouTubeVideo(null), false],
  ])('should show the platform badge for %s: %s', (name, video, expected) => {
    render(<VideoCard value={video} />)

    const thumbnail = screen.getByTestId('video-card-thumbnail')

    if (expected) {
      expect(within(thumbnail).getByText(name)).toHaveClass('top-0', 'right-0')
    } else {
      expect(within(thumbnail).queryByText(name)).not.toBeInTheDocument()
    }
  })

  test('should show a focus ring around the whole card', () => {
    render(<VideoCard value={createYouTubeVideo(null)} />)

    expect(screen.getByRole('link')).toHaveClass(
      'focus-visible:outline-2',
      'focus-visible:outline-accent',
    )
  })

  test.each([
    ['grid', ['flex-col'], 'aspect-video'],
    ['row', ['flex-row', 'sm:flex-col'], 'w-2/5'],
    ['short', ['flex-col'], 'aspect-9/16'],
  ] as const)('should lay out the %s variant', (variant, layout, thumbnail) => {
    render(<VideoCard value={createYouTubeVideo(null)} variant={variant} />)

    expect(screen.getByRole('link')).toHaveClass(...layout)
    expect(screen.getByTestId('video-card-thumbnail')).toHaveClass(thumbnail)
  })
})

describe('VideoCardSkeleton', () => {
  test.each([
    ['grid', ['flex-col'], 'aspect-video'],
    ['row', ['flex-row', 'sm:flex-col'], 'w-2/5'],
    ['short', ['flex-col'], 'aspect-9/16'],
  ] as const)(
    'should have the same layout as the %s variant',
    (variant, layout, thumbnail) => {
      render(<VideoCardSkeleton variant={variant} />)

      const skeleton = screen.getByTestId('video-card-skeleton')

      expect(skeleton).toHaveClass(...layout)
      expect(skeleton.firstElementChild).toHaveClass(thumbnail, 'bg-muted')
    },
  )
})
