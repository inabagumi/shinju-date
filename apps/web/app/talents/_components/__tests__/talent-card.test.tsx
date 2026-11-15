import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import type { TalentListItem } from '@/lib/fetchers'

vi.mock('@/lib/fetchers', () => ({}))

import TalentCard from '../talent-card'
import TalentGrid from '../talent-grid'

const TALENT_ID = '00000000-0000-4000-8000-000000000001'

function createTalent(overrides: Partial<TalentListItem> = {}): TalentListItem {
  return {
    id: TALENT_ID,
    name: '朝霧ミオ',
    twitch_users: [],
    youtube_channels: [{ profile_image: { blur_data_url: '', id: 'icon-1' } }],
    ...overrides,
  }
}

describe('TalentCard', () => {
  test('should link to the page of the talent by its name', () => {
    render(<TalentCard talent={createTalent()} />)

    expect(screen.getByRole('link', { name: '朝霧ミオ' })).toHaveAttribute(
      'href',
      `/talents/${TALENT_ID}`,
    )
  })

  test('should show the icon as a decoration', () => {
    const { container } = render(<TalentCard talent={createTalent()} />)

    expect(screen.getByTestId('talent-icon')).toHaveClass(
      'size-20',
      'sm:size-24',
      'lg:size-28',
    )
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
    expect(container.querySelector('img')?.getAttribute('src')).toContain(
      'profile-images%2Ficon-1',
    )
  })

  test('should show the default icon for a talent without icons', () => {
    render(<TalentCard talent={createTalent({ youtube_channels: [] })} />)

    expect(screen.getByTestId('talent-default-icon')).toBeInTheDocument()
  })

  test('should wrap a long name', () => {
    render(
      <TalentCard
        talent={createTalent({ name: 'AVeryLongTalentNameWithoutSpaces' })}
      />,
    )

    expect(screen.getByText('AVeryLongTalentNameWithoutSpaces')).toHaveClass(
      'wrap-anywhere',
    )
  })
})

describe('TalentGrid', () => {
  test('should list the talents in order', () => {
    render(
      <TalentGrid
        talents={[
          createTalent(),
          createTalent({
            id: '00000000-0000-4000-8000-000000000002',
            name: '夜宵ルナ',
          }),
        ]}
      />,
    )

    const items = screen.getAllByRole('listitem')

    expect(items).toHaveLength(2)
    expect(items.map((item) => item.textContent)).toEqual([
      '朝霧ミオ',
      '夜宵ルナ',
    ])
  })

  test('should show the empty state without any talent', () => {
    render(<TalentGrid talents={[]} />)

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getByText('表示できるタレントがいません')).toBeInTheDocument()
  })
})
