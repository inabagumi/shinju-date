import { createErrorResponse } from '@shinju-date/helpers'
import { logger } from '@shinju-date/logger'
import { stringify } from 'csv-stringify/sync'
import { connection, type NextRequest } from 'next/server'
import type { Period } from '@/lib/analytics/period'
import { exportSearchParamsSchema } from './schema'

/** The arguments that the fetch function of a CSV export receives */
export interface CsvExportQuery {
  limit: number
  range: Period
}

/** The definition of a CSV export */
export interface CsvExportDefinition<T> {
  /** Fetches the rows for the period and the limit of the request */
  fetch: (query: CsvExportQuery) => Promise<T[]>
  /** The header row */
  header: string[]
  /** Turns an item into the values of a row. `index` starts at 0 */
  toRow: (item: T, index: number) => (string | number)[]
  /** The beginning of the filename, followed by the date (e.g. `search-analytics-keywords-`) */
  filenamePrefix: string
}

/**
 * Creates the `GET` handler of a CSV export (`/api/export/*`).
 *
 * - Invalid parameters (see `exportSearchParamsSchema`) respond with 400
 * - No data for the period responds with 404
 * - The CSV has a BOM for Excel, and the filename ends with the date
 *   (`YYYY-MM-DD` for a single day, `YYYY-MM-DD_YYYY-MM-DD` for a range)
 */
export function createCsvExportRoute<T>({
  fetch,
  filenamePrefix,
  header,
  toRow,
}: CsvExportDefinition<T>): (request: NextRequest) => Promise<Response> {
  return async (request) => {
    // Call connection() before accessing searchParams to mark as dynamic
    await connection()

    const result = exportSearchParamsSchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    )

    if (!result.success) {
      return createErrorResponse('Invalid parameters provided', { status: 400 })
    }

    const { limit, range, selectedDate } = result.data

    try {
      const items = await fetch({ limit, range })

      if (items.length === 0) {
        return createErrorResponse(
          'No data available for the specified date range',
          { status: 404 },
        )
      }

      const csvContent = stringify([header, ...items.map(toRow)], {
        bom: true, // Add BOM for Excel compatibility
      })
      const dateStr = selectedDate ?? `${range.start}_${range.end}`
      const filename = `${filenamePrefix}${dateStr}.csv`

      return new Response(csvContent, {
        headers: {
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Type': 'text/csv;charset=utf-8',
        },
      })
    } catch (error) {
      logger.error('CSV のエクスポートに失敗しました', {
        end: range.end,
        error,
        filenamePrefix,
        start: range.start,
      })

      return createErrorResponse('Failed to generate CSV export', {
        status: 500,
      })
    }
  }
}
