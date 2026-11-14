import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { Video } from '@/lib/fetchers'
import ShortVideoCard, { ShortVideoCardSkeleton } from '../short-video-card'

const profileImage = {
  blur_data_url: 'data:image/webp;base64,AAAA',
  id: '00000000-0000-4000-8000-000000000001',
}

function createShortVideo(
  youtubeChannel: NonNullable<Video['youtube_video']>['youtube_channel'],
): Video {
  return {
    duration: 'PT45S',
    id: 'short-video',
    platform: 'youtube',
    published_at: '2026-11-14T11:00:00Z',
    status: 'PUBLISHED',
    talent: { id: 'talent-1', name: 'タレント名' },
    thumbnail: null,
    title: 'ショート動画',
    twitch_video: null,
    video_kind: 'short',
    youtube_video: {
      youtube_channel: youtubeChannel,
      youtube_video_id: 'YT_short1abc',
    },
  }
}

function getCreator() {
  return screen.getByTestId('video-creator')
}

describe('ShortVideoCard', () => {
  test('should show the icon and name of the YouTube channel', () => {
    render(
      <ShortVideoCard
        value={createShortVideo({
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

  test('should use the compact size for the icon', () => {
    render(
      <ShortVideoCard
        value={createShortVideo({
          name: 'チャンネル名',
          profile_image: null,
          youtube_handle: '@channel',
        })}
      />,
    )

    expect(
      within(getCreator()).getByTestId('video-creator-default-icon'),
    ).toHaveClass('size-4')
  })

  test('should show the default icon when the channel has no icon', () => {
    render(
      <ShortVideoCard
        value={createShortVideo({
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
      createShortVideo({
        name: null,
        profile_image: null,
        youtube_handle: '@channel',
      }),
      '@channel',
    ],
    [
      'the talent name for a missing YouTube channel',
      createShortVideo(null),
      'タレント名',
    ],
  ])('should fall back to %s', (_, video, expectedName) => {
    render(<ShortVideoCard value={video} />)

    expect(getCreator()).toHaveTextContent(expectedName)
    expect(screen.getByRole('link')).toBeInTheDocument()
  })

  test('should still render the card without any creator data', () => {
    const video = createShortVideo(null)

    render(
      <ShortVideoCard
        value={{ ...video, talent: null as unknown as Video['talent'] }}
      />,
    )

    expect(screen.getByRole('link')).toHaveTextContent('ショート動画')
    expect(screen.queryByTestId('video-creator')).not.toBeInTheDocument()
  })

  test('should truncate a long channel name and keep the full name in the title', () => {
    const longName = 'とても長いチャンネル名'.repeat(10)

    render(
      <ShortVideoCard
        value={createShortVideo({
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

  test('should not announce the creator icon or nest links in the card', () => {
    render(
      <ShortVideoCard
        value={createShortVideo({
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

describe('ShortVideoCardSkeleton', () => {
  test('should include a placeholder for the creator icon', () => {
    const { container } = render(<ShortVideoCardSkeleton />)

    expect(container.querySelector('.rounded-full.size-4')).not.toBeNull()
  })
})
