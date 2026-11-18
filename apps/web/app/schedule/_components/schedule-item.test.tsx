import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { ScheduleVideo } from '@/lib/data/schedule'
import ScheduleItem, {
  getScheduleVideoUrl,
  getTitleLines,
} from './schedule-item'

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
      twitch_user: {
        name: '朝霧ミオ',
        profile_image: null,
        twitch_login_name: twitchLoginName,
      },
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
    // Without the labels in 【】
    expect(
      screen.getByTitle('【歌枠】アニソン縛り歌ってみた！').textContent,
    ).toBe('アニソン縛り歌ってみた！')
    // The name of the talent, not that of the channel
    expect(item).toHaveTextContent('朝霧ミオ')
    expect(item).not.toHaveTextContent('チャンネル名')
    expect(screen.getByTestId('talent-icon')).toBeInTheDocument()
  })

  test('should keep the whole title in the title attribute', () => {
    render(<ScheduleItem value={createVideo()} />)

    expect(screen.getByText('アニソン縛り歌ってみた！')).toHaveAttribute(
      'title',
      '【歌枠】アニソン縛り歌ってみた！',
    )
  })

  test('should show neither the credits nor the trailing hashtags in the title', () => {
    const title =
      '【歌枠】今日も歌います #歌枠リレー【朝霧ミオ / ななしいんく】'

    render(<ScheduleItem value={createVideo({ title })} />)

    const titleElement = screen.getByTitle(title)

    expect(titleElement.textContent).toBe('今日も歌います')
    expect(getItem()).not.toHaveTextContent('ななしいんく')
  })

  test('should show the first label between the first line and the title', () => {
    render(
      <ScheduleItem
        value={createVideo({ title: '【Minecraft】【雑談】夜の肝試し' })}
      />,
    )

    const tags = screen.getByTestId('schedule-item-tags')

    expect(tags.textContent).toBe('Minecraft')
    expect(tags).toHaveClass('truncate', 'text-caption', 'text-muted')
    expect(tags.previousElementSibling).toHaveTextContent('21:00')
    expect(tags.nextElementSibling).toBe(
      screen.getByTitle('【Minecraft】【雑談】夜の肝試し'),
    )
    // The whole item is a link, so the labels are not links
    expect(tags.querySelector('a')).toBeNull()
  })

  test('should show up to three hashtags after the label', () => {
    render(
      <ScheduleItem
        value={createVideo({
          title: '【Minecraft】夜の肝試し #マイクラ肝試し2026 #a #b #c',
        })}
      />,
    )

    expect(screen.getByTestId('schedule-item-tags').textContent).toBe(
      'Minecraft #マイクラ肝試し2026 #a #b',
    )
  })

  test('should show the hashtags without a label', () => {
    render(
      <ScheduleItem
        value={createVideo({ title: '夜の肝試し #マイクラ肝試し2026' })}
      />,
    )

    expect(screen.getByTestId('schedule-item-tags').textContent).toBe(
      '#マイクラ肝試し2026',
    )
  })

  test('should not show the line without labels and hashtags', () => {
    render(<ScheduleItem value={createVideo({ title: '今日も歌います' })} />)

    expect(screen.queryByTestId('schedule-item-tags')).toBeNull()
    expect(getItem().textContent).toBe('21:00朝霧ミオ今日も歌います')
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

describe('ScheduleItem (on a wide screen)', () => {
  test('should have a frame to stand out from the ground', () => {
    render(<ScheduleItem value={createVideo()} />)

    // The fill is opaque, so the items below do not show through an expanded
    // one
    expect(getItem()).toHaveClass('bg-surface', 'border', 'border-border')
  })

  test('should fill the placement and float with a shadow when expanded', () => {
    render(<ScheduleItem value={createVideo()} />)

    expect(getItem()).toHaveClass(
      'lg:flex-1',
      'lg:overflow-hidden',
      'lg:group-hover/item:shadow-overlay',
      'lg:group-focus-within/item:shadow-overlay',
    )
    // The fill does not change on hover
    expect(getItem().className).not.toMatch(/hover\S*:bg-/)
  })

  test('should keep the same order of the contents when it is narrow', () => {
    render(<ScheduleItem value={createVideo({ status: 'LIVE' })} />)

    // The start and the talent are always there, so the first line does not
    // move when the item is expanded
    expect(getItem().textContent).toBe(
      '21:00配信中朝霧ミオ歌枠アニソン縛り歌ってみた！',
    )
    expect(screen.getByText('アニソン縛り歌ってみた！')).toHaveClass(
      'line-clamp-2',
      'lg:group-hover/item:line-clamp-none',
    )
  })

  test('should show the labels and hashtags only when expanded', () => {
    render(<ScheduleItem titleLines={1} value={createVideo()} />)

    // Shown, the line would leave no room for the title in an item of an hour
    expect(screen.getByTestId('schedule-item-tags')).toHaveClass(
      'lg:hidden',
      'lg:group-hover/item:block',
      'lg:group-focus-within/item:block',
    )
  })
})

describe('getTitleLines', () => {
  afterEach(() => {
    vi.doUnmock('../_lib/layout')
    vi.resetModules()
  })

  test.each([
    [30, 0],
    [60, 1],
    [90, 2],
    [120, 4],
  ])('should fit the title of %i minutes in %i lines', (minutes, lines) => {
    // The line of the labels and hashtags is not shown unless the item is
    // expanded, so it takes no room from the title
    expect(getTitleLines(minutes)).toBe(lines)
  })

  test('should follow the height of an hour in the layout', async () => {
    vi.resetModules()
    vi.doMock('../_lib/layout', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../_lib/layout')>()),
      HOUR_HEIGHT_REM: 8,
    }))
    const { getTitleLines: getTitleLinesOfTallerHours } = await import(
      './schedule-item'
    )

    // An hour is 128px, twice as tall as the default
    expect(getTitleLinesOfTallerHours(30)).toBe(1)
    expect(getTitleLinesOfTallerHours(60)).toBe(4)
    expect(getTitleLinesOfTallerHours(120)).toBe(9)
  })
})

describe('getScheduleVideoUrl', () => {
  test('should return null for a pending Twitch archive without the login', () => {
    const video = createTwitchVideo({}, null)

    expect(
      getScheduleVideoUrl({
        ...video,
        twitch_video: {
          twitch_user: {
            name: '朝霧ミオ',
            profile_image: null,
            twitch_login_name: null,
          },
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
