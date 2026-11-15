import { render, screen, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import type { TalentDetail } from '@/lib/fetchers'

vi.mock('@/lib/fetchers', () => ({}))

import { TalentPageHeader } from '../talent-page-header'

const TALENT_ID = '00000000-0000-4000-8000-000000000001'

function createTalent(overrides: Partial<TalentDetail> = {}): TalentDetail {
  return {
    id: TALENT_ID,
    name: '一ノ瀬うるは',
    twitch_users: [
      {
        name: '一ノ瀬うるは',
        profile_image: null,
        twitch_login_name: 'uruha',
        twitch_user_id: '100',
      },
    ],
    youtube_channels: [
      {
        name: '一ノ瀬うるは',
        profile_image: { blur_data_url: '', id: 'icon-1' },
        youtube_channel_id: 'UCuruha',
        youtube_handle: '@uruha',
      },
    ],
    ...overrides,
  }
}

describe('TalentPageHeader', () => {
  test('should show the icon and the name as the page heading', () => {
    const { container } = render(<TalentPageHeader talent={createTalent()} />)

    expect(
      screen.getByRole('heading', { level: 1, name: '一ノ瀬うるは' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('talent-icon')).toBeInTheDocument()
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
    expect(
      within(
        screen.getByRole('navigation', { name: 'パンくずリスト' }),
      ).getByText('一ノ瀬うるは'),
    ).toBeInTheDocument()
  })

  test('should open the channels in a new tab', () => {
    render(<TalentPageHeader talent={createTalent()} />)

    const youtubeLink = screen.getByRole('link', { name: 'YouTube チャンネル' })
    const twitchLink = screen.getByRole('link', { name: 'Twitch チャンネル' })

    expect(youtubeLink).toHaveAttribute(
      'href',
      'https://www.youtube.com/channel/UCuruha',
    )
    expect(twitchLink).toHaveAttribute('href', 'https://www.twitch.tv/uruha')

    for (const link of [youtubeLink, twitchLink]) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  test('should link to the calendar in the same tab', () => {
    render(<TalentPageHeader talent={createTalent()} />)

    const calendarLink = screen.getByRole('link', { name: 'カレンダーに登録' })

    expect(calendarLink).toHaveAttribute(
      'href',
      `/channels/${TALENT_ID}/videos.ics`,
    )
    expect(calendarLink).not.toHaveAttribute('target')
  })

  test('should show the default icon for a talent without icons', () => {
    render(
      <TalentPageHeader
        talent={createTalent({ twitch_users: [], youtube_channels: [] })}
      />,
    )

    expect(screen.getByTestId('talent-default-icon')).toBeInTheDocument()
    expect(screen.queryAllByRole('link', { name: /チャンネル/ })).toHaveLength(
      0,
    )
  })
})
