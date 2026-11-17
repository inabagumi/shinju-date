import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { VideoFilters } from './video-filters'

const mockSearchParams = vi.hoisted(() => ({ current: new URLSearchParams() }))

vi.mock('next/navigation', () => ({
  usePathname: () => '/videos',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => mockSearchParams.current,
}))

describe('VideoFilters toggle', () => {
  it('collapses the filter options until the toggle is pressed', () => {
    mockSearchParams.current = new URLSearchParams()
    render(<VideoFilters talents={[]} />)

    const filterBar = screen.getByRole('group', { name: '絞り込み' })
    const toggle = screen.getByRole('button', { name: /^絞り込み/ })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(filterBar).toHaveAttribute('data-state', 'closed')

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(filterBar).toHaveAttribute('data-state', 'open')
  })

  it('keeps the search input outside the collapsed options', () => {
    mockSearchParams.current = new URLSearchParams()
    render(<VideoFilters talents={[]} />)

    expect(
      screen.getByRole('group', { name: '絞り込み' }),
    ).not.toContainElement(screen.getByLabelText('タイトルまたはIDで検索'))
  })

  it('shows the number of applied filters on the toggle', () => {
    mockSearchParams.current = new URLSearchParams(
      'status=LIVE&status=UPCOMING&platform=youtube&search=test',
    )
    render(<VideoFilters talents={[]} />)

    expect(
      screen.getByRole('button', { name: /^絞り込み.*2件適用中/ }),
    ).toBeInTheDocument()
  })

  it('does not show a count when no filters are applied', () => {
    mockSearchParams.current = new URLSearchParams('search=test')
    render(<VideoFilters talents={[]} />)

    expect(
      screen.getByRole('button', { name: /^絞り込み/ }).textContent,
    ).not.toMatch(/件適用中/)
  })
})
