import { render, screen, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@/lib/fetchers', () => ({}))

import { StreamTendency } from './talent-stream-tendency'

function createCounts(
  cells: [weekday: number, hour: number, count: number][] = [],
): number[][] {
  const counts = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => 0),
  )

  for (const [weekday, hour, count] of cells) {
    const row = counts[weekday]

    if (row) {
      row[hour] = count
    }
  }

  return counts
}

// 12 streams: 8 on Saturday at 21, 3 on Friday at 22 and 1 on Monday at 0
const COUNTS = createCounts([
  [5, 21, 8],
  [4, 22, 3],
  [0, 0, 1],
])

describe('StreamTendency', () => {
  test('should show the heading and the summary', () => {
    render(<StreamTendency counts={COUNTS} />)

    expect(
      screen.getByRole('heading', { level: 2, name: '配信の傾向' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'P' &&
          element.textContent ===
            '直近90日の配信は12回。いちばん多いのは土曜日、時間帯は21時台です。',
      ),
    ).toBeInTheDocument()
  })

  test('should fold into a line with the busiest day and hour', () => {
    const { container } = render(<StreamTendency counts={COUNTS} />)

    const summary = container.querySelector('details > summary')

    expect(container.querySelector('details')).not.toHaveAttribute('open')
    expect(summary).toHaveTextContent('配信の傾向土曜日・21時台が多い')
  })

  test('should read out the count of each cell by the day and the hour', () => {
    render(<StreamTendency counts={COUNTS} />)

    const table = screen.getByRole('table', {
      name: '曜日と時間帯ごとの配信回数',
    })
    const rows = within(table).getAllByRole('row')

    // The row of the hours and a row for each day of the week
    expect(rows).toHaveLength(8)
    expect(within(table).getAllByRole('columnheader')).toHaveLength(24)
    expect(
      within(table).getByRole('columnheader', { name: '21時' }),
    ).toBeInTheDocument()

    const saturday = within(table)
      .getByRole('rowheader', { name: '土曜日' })
      .closest('tr')

    if (!saturday) {
      throw new Error('The row of Saturday is missing')
    }

    const cells = within(saturday).getAllByRole('cell')

    expect(cells).toHaveLength(24)
    expect(cells[21]).toHaveTextContent('8回')
    expect(cells[20]).toHaveTextContent('0回')
  })

  test('should show the numbers of only some hours', () => {
    render(<StreamTendency counts={COUNTS} />)

    for (const hour of [0, 6, 12, 18]) {
      expect(
        screen
          .getByRole('columnheader', { name: `${hour}時` })
          .querySelector('[aria-hidden="true"]'),
      ).toHaveTextContent(String(hour))
    }

    expect(
      screen
        .getByRole('columnheader', { name: '21時' })
        .querySelector('[aria-hidden="true"]'),
    ).toBeNull()
  })

  test('should shade the cells by the count with the accent', () => {
    render(<StreamTendency counts={COUNTS} />)

    const cells = screen.getAllByTestId('stream-tendency-cell')
    const classNames = new Set(cells.map((cell) => cell.className))

    expect(cells).toHaveLength(7 * 24)

    // Saturday at 21 is the busiest, Friday at 22 is 3 / 8 and Monday at 0 is
    // 1 / 8 of it
    expect(cells[5 * 24 + 21]).toHaveClass('bg-accent')
    expect(cells[4 * 24 + 22]).toHaveClass('bg-accent/50')
    expect(cells[0]).toHaveClass('bg-accent/25')
    expect(cells[1]).toHaveClass('bg-muted')

    for (const className of classNames) {
      expect(className).toMatch(
        /\bbg-(muted|accent|accent\/25|accent\/50|accent\/75)$/,
      )
    }
  })

  test('should render nothing with fewer than 10 streams', () => {
    const { container } = render(
      <StreamTendency counts={createCounts([[5, 21, 9]])} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  test('should render nothing without streams', () => {
    const { container } = render(<StreamTendency counts={createCounts()} />)

    expect(container).toBeEmptyDOMElement()
  })
})
