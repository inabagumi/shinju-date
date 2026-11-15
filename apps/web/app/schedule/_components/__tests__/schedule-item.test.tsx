import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { ScheduleVideo } from '@/lib/fetchers'
import ScheduleItem from '../schedule-item'

function createVideo(overrides: Partial<ScheduleVideo> = {}): ScheduleVideo {
  return {
    id: 'video-1',
    platform: 'youtube',
    // 21:00 on 14 November in Japan
    published_at: '2026-11-14T12:00:00Z',
    status: 'UPCOMING',
    talent: { id: 'talent-1', name: '朝霧ミオ', theme_color: '#FF6B9D' },
    title: '【歌枠】アニソン縛り歌ってみた！',
    twitch_video: null,
    youtube_video: {
      youtube_channel: {
        name: 'チャンネル名',
        profile_image: null,
        youtube_handle: '@channel',
      },
      youtube_video_id: 'YT_video1abc',
    },
    ...overrides,
  }
}

function getItem() {
  return screen.getByTestId('schedule-item')
}

describe('ScheduleItem', () => {
  test('should show the start, the status, the title and the talent', () => {
    render(<ScheduleItem value={createVideo()} />)

    const item = getItem()

    expect(item).toHaveTextContent('21:00')
    expect(item).toHaveTextContent('予定')
    expect(item).toHaveTextContent('【歌枠】アニソン縛り歌ってみた！')
    // The name of the talent, not that of the channel
    expect(item).toHaveTextContent('朝霧ミオ')
    expect(item).not.toHaveTextContent('チャンネル名')
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
    expect(getItem().querySelector('img')).toBeNull()
  })

  test('should mark the stream on air with the text', () => {
    render(<ScheduleItem value={createVideo({ status: 'LIVE' })} />)

    expect(screen.getByText('配信中')).toHaveClass('bg-live')
  })

  test.each([
    ['ENDED', '終了済み'],
    ['PUBLISHED', '公開済み'],
    ['UPCOMING', '予定'],
  ] as const)('should label %s as %s', (status, label) => {
    render(<ScheduleItem value={createVideo({ status })} />)

    expect(getItem()).toHaveTextContent(label)
    expect(screen.queryByText('配信中')).toBeNull()
  })

  test('should draw the line with the theme color of the talent', () => {
    render(<ScheduleItem value={createVideo()} />)

    const item = getItem()

    expect(item.style.getPropertyValue('--talent-color')).toBe('#ff6b9d')
    expect(item).toHaveClass('border-l-(--talent-color)')
    expect(item).not.toHaveClass('border-l-border')
  })

  test.each([null, 'red', '#ff6b9d; color: red', 'url(https://example.com/)'])(
    'should use the border color for the theme color %j',
    (themeColor) => {
      render(
        <ScheduleItem
          value={createVideo({
            talent: {
              id: 'talent-1',
              name: '朝霧ミオ',
              theme_color: themeColor,
            },
          })}
        />,
      )

      const item = getItem()

      expect(item.style.getPropertyValue('--talent-color')).toBe('')
      expect(item).toHaveClass('border-l-border')
      expect(item).not.toHaveClass('border-l-(--talent-color)')
    },
  )

  test('should not use the theme color for the text', () => {
    render(<ScheduleItem value={createVideo()} />)

    for (const element of getItem().querySelectorAll('*')) {
      expect(element.getAttribute('style') ?? '').toBe('')
      expect(element.getAttribute('class') ?? '').not.toMatch(/--talent-color/)
    }
  })

  test('should show the Twitch badge and link to Twitch', () => {
    render(
      <ScheduleItem
        value={createVideo({
          platform: 'twitch',
          status: 'ENDED',
          twitch_video: {
            twitch_user: {
              name: '朝霧ミオ',
              profile_image: null,
              twitch_login_name: 'mio',
            },
            twitch_video_id: '1234567890',
            type: 'archive',
          },
          youtube_video: null,
        })}
      />,
    )

    expect(getItem()).toHaveAttribute(
      'href',
      'https://www.twitch.tv/videos/1234567890',
    )
    expect(screen.getByText('Twitch')).toBeInTheDocument()
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
