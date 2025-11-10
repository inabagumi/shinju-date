import { createErrorResponse } from '@shinju-date/helpers'
import { stringify } from 'csv-stringify/sync'
import { connection, type NextRequest, NextResponse } from 'next/server'
import { Temporal } from 'temporal-polyfill'
import { getSearchExitRates } from '@/lib/analytics/get-search-quality-metrics'
import { exportSearchParamsSchema } from '../_lib/schema'

type SearchExitRate = {
  keyword: string
  exitRate: number
  searchCount: number
}

/**
 * Export search exit rates data as CSV
 */
export async function GET(request: NextRequest) {
  // Call connection() before accessing searchParams to mark as dynamic
  await connection()

  try {
    // Parse and validate query parameters
    const searchParams = Object.fromEntries(
      request.nextUrl.searchParams.entries(),
    )
    const validatedParams = exportSearchParamsSchema.parse(searchParams)

    // Fetch data based on parameters
    let exitRates: SearchExitRate[]
    if (validatedParams.selectedDate) {
      exitRates = await getSearchExitRates(
        Temporal.PlainDate.from(validatedParams.selectedDate),
        undefined,
        validatedParams.limit,
      )
    } else if (validatedParams.endDate) {
      const start = Temporal.PlainDate.from(validatedParams.startDate)
      const end = Temporal.PlainDate.from(validatedParams.endDate)
      exitRates = await getSearchExitRates(start, end, validatedParams.limit)
    } else {
      exitRates = await getSearchExitRates(
        Temporal.PlainDate.from(validatedParams.startDate),
        undefined,
        validatedParams.limit,
      )
    }

    // Check if data is available
    if (exitRates.length === 0) {
      return createErrorResponse(
        'No data available for the specified date range',
        {
          status: 404,
        },
      )
    }

    // Prepare data for CSV export
    const csvData = [
      ['順位', 'キーワード', '検索回数', '離脱率'],
      ...exitRates.map((item, index) => [
        index + 1,
        item.keyword,
        item.searchCount,
        `${item.exitRate.toFixed(1)}%`,
      ]),
    ]

    // Generate CSV content using csv-stringify
    const csvContent = stringify(csvData, {
      bom: true, // Add BOM for Excel compatibility
    })

    // Generate filename
    const dateStr =
      validatedParams.selectedDate ||
      `${validatedParams.startDate}_${validatedParams.endDate || validatedParams.startDate}`
    const filename = `search-exit-rates-${dateStr}.csv`

    // Return CSV response
    return new NextResponse(csvContent, {
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'text/csv;charset=utf-8',
      },
    })
  } catch (error) {
    console.error('CSV export error:', error)

    // Handle validation errors
    if (error instanceof Error && 'issues' in error) {
      return createErrorResponse('Invalid parameters provided', { status: 400 })
    }

    return createErrorResponse('Failed to generate CSV export', { status: 500 })
  }
}
