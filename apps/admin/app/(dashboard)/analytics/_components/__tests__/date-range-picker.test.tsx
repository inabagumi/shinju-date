import { TIME_ZONE } from '@shinju-date/constants'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DateRangePicker from '../date-range-picker'

const PRESET_LABELS = ['過去7日間', '過去30日間', '過去90日間', '今月', '先月']

function getPressedButtons() {
  return screen
    .getAllByRole('button')
    .filter((button) => button.getAttribute('aria-pressed') === 'true')
    .map((button) => button.textContent)
}

describe('DateRangePicker', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(Temporal.Now, 'zonedDateTimeISO').mockReturnValue(
      Temporal.ZonedDateTime.from(`2026-11-14T12:00:00[${TIME_ZONE}]`),
    )
  })

  it('marks the preset that matches the current period as pressed', () => {
    render(
      <DateRangePicker
        onChange={vi.fn()}
        value={{ endDate: '2026-11-14', startDate: '2026-10-16' }}
      />,
    )

    expect(getPressedButtons()).toEqual(['過去30日間'])
    expect(
      screen.getByRole('button', { name: 'カスタム期間を選択' }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('marks every preset that resolves to the same period', () => {
    // On the 7th, "this month" covers the same days as "the past 7 days"
    vi.spyOn(Temporal.Now, 'zonedDateTimeISO').mockReturnValue(
      Temporal.ZonedDateTime.from(`2026-11-07T12:00:00[${TIME_ZONE}]`),
    )

    render(
      <DateRangePicker
        onChange={vi.fn()}
        value={{ endDate: '2026-11-07', startDate: '2026-11-01' }}
      />,
    )

    expect(getPressedButtons()).toEqual(['過去7日間', '今月'])
  })

  it('marks the custom period button when no preset matches', () => {
    render(
      <DateRangePicker
        onChange={vi.fn()}
        value={{ endDate: '2026-11-10', startDate: '2026-11-03' }}
      />,
    )

    expect(getPressedButtons()).toEqual(['カスタム期間を選択'])
    for (const label of PRESET_LABELS) {
      expect(screen.getByRole('button', { name: label })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    }
  })

  it('applies the range of the clicked preset', () => {
    const onChange = vi.fn()

    render(
      <DateRangePicker
        onChange={onChange}
        value={{ endDate: '2026-11-14', startDate: '2026-11-08' }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '先月' }))

    expect(onChange).toHaveBeenCalledWith({
      endDate: '2026-10-31',
      startDate: '2026-10-01',
    })
  })

  it('starts editing a custom period from the current period', () => {
    render(
      <DateRangePicker
        onChange={vi.fn()}
        value={{ endDate: '2026-11-10', startDate: '2026-11-03' }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'カスタム期間を選択' }))

    expect(screen.getByLabelText('開始日')).toHaveValue('2026-11-03')
    expect(screen.getByLabelText('終了日')).toHaveValue('2026-11-10')
  })
})
