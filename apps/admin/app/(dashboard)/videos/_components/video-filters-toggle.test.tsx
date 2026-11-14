import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { VideoFilters } from './video-filters'

const mockSearchParams = vi.hoisted(() => ({ current: new URLSearchParams() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => mockSearchParams.current,
}))

describe('VideoFilters toggle', () => {
  it('collapses the filter options until the toggle is pressed', () => {
    mockSearchParams.current = new URLSearchParams()
    render(<VideoFilters talents={[]} />)

    const toggle = screen.getByRole('button', { name: /^絞り込み/ })
    const options = document.getElementById('video-filter-options')

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', 'video-filter-options')
    expect(options).toHaveClass('hidden')

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(options).not.toHaveClass('hidden')
  })

  it('keeps the search input outside the collapsed options', () => {
    mockSearchParams.current = new URLSearchParams()
    render(<VideoFilters talents={[]} />)

    const options = document.getElementById('video-filter-options')

    expect(options).not.toContainElement(
      screen.getByLabelText('タイトルまたはIDで検索'),
    )
  })

  it('shows the number of applied filters on the toggle', () => {
    mockSearchParams.current = new URLSearchParams(
      'status=LIVE&status=UPCOMING&platform=youtube&search=test',
    )
    render(<VideoFilters talents={[]} />)

    expect(
      screen.getByRole('button', { name: /^絞り込み.*2件の条件を適用中/ }),
    ).toBeInTheDocument()
  })

  it('does not show a count when no filters are applied', () => {
    mockSearchParams.current = new URLSearchParams('search=test')
    render(<VideoFilters talents={[]} />)

    expect(
      screen.getByRole('button', { name: /^絞り込み/ }).textContent,
    ).not.toMatch(/件の条件を適用中/)
  })
})
