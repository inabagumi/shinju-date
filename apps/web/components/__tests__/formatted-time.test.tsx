import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import FormattedTime from '../formatted-time'

const dateTime = Temporal.ZonedDateTime.from(
  '2026-03-26T01:22:03+09:00[Asia/Tokyo]',
)

describe('FormattedTime', () => {
  beforeEach(() => {
    vi.spyOn(Temporal.Now, 'zonedDateTimeISO').mockReturnValue(
      Temporal.ZonedDateTime.from('2026-11-14T12:00:00+09:00[Asia/Tokyo]'),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('renders the time with a zero-padded hour', () => {
    render(<FormattedTime dateTime={dateTime} />)

    const time = screen.getByText('01:22')

    expect(time).toHaveAttribute('dateTime', '2026-03-26T01:22:03+09:00')
    expect(time).toHaveAttribute('title', '2026/03/26 01:22:03')
  })

  test('renders the date and time without the year in the current year', () => {
    render(
      <FormattedTime
        dateTime={dateTime}
        options={{ dateStyle: 'short', timeStyle: 'short' }}
      />,
    )

    expect(screen.getByText('03/26 01:22')).toBeInTheDocument()
  })

  test('renders the year when it differs from the current year', () => {
    render(
      <FormattedTime
        dateTime={dateTime.with({ year: 2025 })}
        options={{ dateStyle: 'short', timeStyle: 'short' }}
      />,
    )

    expect(screen.getByText('2025/03/26 01:22')).toBeInTheDocument()
  })

  test('renders seconds when timeStyle is not short', () => {
    render(
      <FormattedTime dateTime={dateTime} options={{ timeStyle: 'medium' }} />,
    )

    expect(screen.getByText('01:22:03')).toBeInTheDocument()
  })
})
