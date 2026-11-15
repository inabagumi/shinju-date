import { render, screen, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import type { TalentSummary } from '@/lib/fetchers'

vi.mock('@/lib/fetchers', () => ({}))

import { TalentCard, TalentGrid } from '../talent-list'

function createTalent(overrides: Partial<TalentSummary> = {}): TalentSummary {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    name: '朝霧ミオ',
    twitch_users: [],
    youtube_channels: [
      { profile_image: { blur_data_url: '', id: 'youtube-icon' } },
    ],
    ...overrides,
  }
}

describe('TalentCard', () => {
  test('should link the icon and the name to the talent page', () => {
    const { container } = render(<TalentCard talent={createTalent()} />)

    const link = screen.getByRole('link', { name: '朝霧ミオ' })

    expect(link).toHaveAttribute(
      'href',
      '/talents/00000000-0000-4000-8000-000000000001',
    )
    expect(within(link).getByTestId('talent-icon')).toBeInTheDocument()
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
    expect(container.querySelector('img')?.getAttribute('src')).toContain(
      'profile-images%2Fyoutube-icon',
    )
  })

  test('should use the same icon as the talent page', () => {
    const { container } = render(
      <TalentCard
        talent={createTalent({
          twitch_users: [
            { profile_image: { blur_data_url: '', id: 'twitch-icon' } },
          ],
          youtube_channels: [{ profile_image: null }],
        })}
      />,
    )

    expect(container.querySelector('img')?.getAttribute('src')).toContain(
      'profile-images%2Ftwitch-icon',
    )
  })

  test('should show the default icon for a talent without icons', () => {
    render(
      <TalentCard
        talent={createTalent({ twitch_users: [], youtube_channels: [] })}
      />,
    )

    expect(screen.getByTestId('talent-default-icon')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
  })
})

describe('TalentGrid', () => {
  test('should list the talents in the given order', () => {
    render(
      <TalentGrid
        talents={[
          createTalent(),
          createTalent({
            id: '00000000-0000-4000-8000-000000000002',
            name: '風花リツ',
          }),
        ]}
      />,
    )

    const items = within(screen.getByRole('list')).getAllByRole('listitem')

    expect(items.map((item) => item.textContent)).toEqual([
      '朝霧ミオ',
      '風花リツ',
    ])
  })

  test('should show the empty state without any talents', () => {
    render(<TalentGrid talents={[]} />)

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getByText('表示できるタレントはいません')).toBeInTheDocument()
  })
})
