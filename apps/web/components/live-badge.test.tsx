import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import LiveBadge from './live-badge'

describe('LiveBadge', () => {
  test('should render the badge', () => {
    render(<LiveBadge />)

    expect(screen.getByText('配信中')).toHaveClass(
      'rounded-control',
      'bg-live',
      'px-1.5',
      'py-0.5',
      'text-caption',
      'font-semibold',
      'text-live-foreground',
    )
  })

  test('should fit in a compact row', () => {
    render(<LiveBadge size="compact" />)

    expect(screen.getByText('配信中')).toHaveClass('leading-4')
  })

  test('should take the position and the id', () => {
    render(<LiveBadge className="absolute top-0" id="status" />)

    const badge = screen.getByText('配信中')

    expect(badge).toHaveClass('absolute', 'top-0', 'bg-live')
    expect(badge).toHaveAttribute('id', 'status')
  })
})
