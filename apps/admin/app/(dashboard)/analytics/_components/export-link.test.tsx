import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildExportHref, ExportLink } from './export-link'

describe('buildExportHref', () => {
  it('exports the whole date range when no date is selected', () => {
    expect(
      buildExportHref({
        dateRange: { endDate: '2026-11-14', startDate: '2026-11-08' },
        selectedDate: null,
        type: 'videos',
      }),
    ).toBe('/api/export/videos?from=2026-11-08&to=2026-11-14')
  })

  it('omits the end of a single-day range', () => {
    expect(
      buildExportHref({
        dateRange: { endDate: '2026-11-14', startDate: '2026-11-14' },
        selectedDate: null,
        type: 'keywords',
      }),
    ).toBe('/api/export/keywords?from=2026-11-14')
  })

  it('exports only the selected date', () => {
    expect(
      buildExportHref({
        dateRange: { endDate: '2026-11-14', startDate: '2026-11-08' },
        selectedDate: '2026-11-10',
        type: 'talents',
      }),
    ).toBe('/api/export/talents?date=2026-11-10')
  })
})

describe('ExportLink', () => {
  it('renders a single link to the CSV download', () => {
    render(
      <ExportLink
        dateRange={{ endDate: '2026-11-14', startDate: '2026-11-08' }}
        selectedDate={null}
        type="search-exit-rates"
      />,
    )

    expect(
      screen.getByRole('link', { name: 'CSV をダウンロード' }),
    ).toHaveAttribute(
      'href',
      '/api/export/search-exit-rates?from=2026-11-08&to=2026-11-14',
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
