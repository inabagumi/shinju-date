import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TableSkeleton } from '../table-skeleton'

describe('TableSkeleton', () => {
  const columns = [
    { header: false, id: 'select' },
    { id: 'title' },
    {
      align: 'end' as const,
      cell: <span data-testid="clicks" />,
      id: 'clicks',
    },
  ]

  it('draws the given columns and rows, hidden from assistive technology', () => {
    const { container } = render(<TableSkeleton columns={columns} rows={3} />)

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelectorAll('thead th')).toHaveLength(3)
    expect(container.querySelectorAll('tbody tr')).toHaveLength(3)
    expect(container.querySelectorAll('tbody tr:first-child td')).toHaveLength(
      3,
    )
  })

  it('leaves the header of a column without a heading empty', () => {
    const { container } = render(<TableSkeleton columns={columns} rows={1} />)
    const headers = container.querySelectorAll('thead th')

    expect(headers[0]?.querySelector('[aria-hidden="true"]')).toBeNull()
    expect(headers[1]?.querySelector('[aria-hidden="true"]')).toHaveClass(
      'bg-border',
    )
  })

  it('draws the given cells, aligned to the end when asked', () => {
    const { getAllByTestId } = render(
      <TableSkeleton columns={columns} rows={2} />,
    )
    const cells = getAllByTestId('clicks')

    expect(cells).toHaveLength(2)
    expect(cells[0]?.parentElement).toHaveClass('justify-end')
  })

  it('draws the filter bar above the table', () => {
    const { container, getByTestId } = render(
      <TableSkeleton
        columns={columns}
        filterBar={<div data-testid="filter-bar" />}
      />,
    )

    expect(container.firstElementChild?.firstElementChild).toBe(
      getByTestId('filter-bar'),
    )
  })
})
