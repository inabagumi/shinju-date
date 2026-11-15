import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { ScheduleVideo } from '@/lib/fetchers'
import ScheduleItem, { getScheduleVideoUrl } from '../schedule-item'

const profileImage = {
  blur_data_url: 'data:image/webp;base64,AAAA',
  id: '00000000-0000-4000-8000-000000000001',
}

function createVideo(overrides: Partial<ScheduleVideo> = {}): ScheduleVideo {
  return {
    duration: 'P0D',
    id: 'video-1',
    platform: 'youtube',
    // 21:00 on 14 November in Japan
    published_at: '2026-11-14T12:00:00Z',
    status: 'UPCOMING',
    talent: { id: 'talent-1', name: '朝霧ミオ', theme_color: '#FF6B9D' },
    title: '【歌枠】アニソン縛り歌ってみた！',
    twitch_video: null,
    video_kind: 'standard',
    youtube_video: {
      youtube_channel: {
        name: 'チャンネル名',
        profile_image: profileImage,
        youtube_handle: '@channel',
      },
      youtube_video_id: 'YT_video1abc',
    },
    ...overrides,
  }
}

function createTwitchVideo(
  overrides: Partial<ScheduleVideo> = {},
  twitchLoginName: string | null = 'mio',
): ScheduleVideo {
  return createVideo({
    platform: 'twitch',
    status: 'ENDED',
    twitch_video: {
      twitch_user: twitchLoginName
        ? {
            name: '朝霧ミオ',
            profile_image: null,
            twitch_login_name: twitchLoginName,
          }
        : null,
      twitch_video_id: '1234567890',
      type: 'archive',
    },
    youtube_video: null,
    ...overrides,
  })
}

function getItem() {
  return screen.getByTestId('schedule-item')
}

describe('ScheduleItem', () => {
  test('should show the start, the talent and the title', () => {
    render(<ScheduleItem value={createVideo()} />)

    const item = getItem()

    expect(item).toHaveTextContent('21:00')
    expect(item).toHaveTextContent('【歌枠】アニソン縛り歌ってみた！')
    // The name of the talent, not that of the channel
    expect(item).toHaveTextContent('朝霧ミオ')
    expect(item).not.toHaveTextContent('チャンネル名')
    expect(screen.getByTestId('talent-icon')).toBeInTheDocument()
  })

  test('should keep the whole title in the title attribute', () => {
    render(<ScheduleItem value={createVideo()} />)

    expect(
      screen.getByText('【歌枠】アニソン縛り歌ってみた！'),
    ).toHaveAttribute('title', '【歌枠】アニソン縛り歌ってみた！')
  })

  test('should link like a video card', () => {
    render(<ScheduleItem value={createVideo()} />)

    const item = getItem()

    expect(item).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=YT_video1abc',
    )
    expect(item).toHaveAttribute('ping', '/api/ping')
    expect(item).toHaveAttribute('rel', 'noopener noreferrer')
    expect(item).toHaveAttribute('target', '_blank')
  })

  test('should not show a thumbnail', () => {
    render(<ScheduleItem value={createVideo()} />)

    expect(screen.queryByTestId('video-card-thumbnail')).toBeNull()
  })

  test('should mark the stream on air with the text', () => {
    render(<ScheduleItem value={createVideo({ status: 'LIVE' })} />)

    expect(screen.getByText('配信中')).toHaveClass('bg-live')
  })

  test.each(['ENDED', 'PUBLISHED', 'UPCOMING'] as const)(
    'should not mark a video that is %s',
    (status) => {
      render(<ScheduleItem value={createVideo({ status })} />)

      expect(screen.queryByText('配信中')).toBeNull()
      // No status text between the start and the talent
      expect(getItem().textContent).toMatch(/^21:00朝霧ミオ/)
    },
  )

  test('should draw the line with the theme color of the talent', () => {
    render(<ScheduleItem value={createVideo()} />)

    const item = getItem()

    expect(item.style.getPropertyValue('--talent-color')).toBe('#ff6b9d')
    expect(item).toHaveClass('border-l-(--talent-color)')
    expect(item).not.toHaveClass('border-l-border')
  })

  test.each([
    null,
    'red',
    '#fff',
    '#ff6b9d; color: red',
    'url(https://example.com/)',
  ])('should use the border color for the theme color %j', (themeColor) => {
    render(
      <ScheduleItem
        value={createVideo({
          talent: { id: 'talent-1', name: '朝霧ミオ', theme_color: themeColor },
        })}
      />,
    )

    const item = getItem()

    expect(item).not.toHaveAttribute('style')
    expect(item).toHaveClass('border-l-border')
    expect(item).not.toHaveClass('border-l-(--talent-color)')
  })

  test('should not use the theme color for the text', () => {
    render(<ScheduleItem value={createVideo()} />)

    for (const element of getItem().querySelectorAll('*')) {
      expect(element.getAttribute('class') ?? '').not.toMatch(/--talent-color/)
    }
  })

  test('should show the Twitch badge and link to Twitch', () => {
    render(<ScheduleItem value={createTwitchVideo()} />)

    expect(getItem()).toHaveAttribute(
      'href',
      'https://www.twitch.tv/videos/1234567890',
    )
    expect(screen.getByText('Twitch')).toBeInTheDocument()
    expect(screen.getByTestId('talent-default-icon')).toBeInTheDocument()
  })

  test('should render nothing without a link', () => {
    const { container } = render(
      <ScheduleItem
        value={createVideo({ twitch_video: null, youtube_video: null })}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})

describe('ScheduleItem (compact)', () => {
  test('should name the link with everything it does not show', () => {
    render(<ScheduleItem compact value={createVideo({ status: 'LIVE' })} />)

    expect(getItem()).toHaveAttribute(
      'aria-label',
      '21:00 配信中 朝霧ミオ 【歌枠】アニソン縛り歌ってみた！',
    )
  })

  test('should show only the icon, and everything when it is expanded', () => {
    render(<ScheduleItem compact value={createVideo()} />)

    const title = screen.getByText('【歌枠】アニソン縛り歌ってみた！')

    expect(title).toHaveClass(
      'lg:hidden',
      'lg:group-hover/item:block',
      'lg:group-focus-within/item:block',
      'lg:group-hover/item:line-clamp-none',
    )
  })

  test('should not name the link when it is not compact', () => {
    render(<ScheduleItem value={createVideo()} />)

    expect(getItem()).not.toHaveAttribute('aria-label')
    expect(
      screen.getByText('【歌枠】アニソン縛り歌ってみた！'),
    ).not.toHaveClass('lg:hidden')
  })
})

describe('getScheduleVideoUrl', () => {
  test('should return null for a pending Twitch archive without the login', () => {
    const video = createTwitchVideo({}, null)

    expect(
      getScheduleVideoUrl({
        ...video,
        twitch_video: {
          twitch_user: null,
          twitch_video_id: 'live:12345678901',
          type: null,
        },
      }),
    ).toBeNull()
  })

  test('should link a pending Twitch archive to the channel', () => {
    const video = createTwitchVideo()

    expect(
      getScheduleVideoUrl({
        ...video,
        twitch_video: {
          twitch_user: {
            name: '朝霧ミオ',
            profile_image: null,
            twitch_login_name: 'mio',
          },
          twitch_video_id: 'live:12345678901',
          type: null,
        },
      }),
    ).toBe('https://www.twitch.tv/mio')
  })
})
