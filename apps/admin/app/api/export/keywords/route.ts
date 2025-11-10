import { createErrorResponse } from '@shinju-date/helpers'
import { stringify } from 'csv-stringify/sync'
import { connection, type NextRequest, NextResponse } from 'next/server'
import { Temporal } from 'temporal-polyfill'
import {
  getPopularKeywords,
  type PopularKeyword,
} from '@/lib/analytics/get-popular-keywords'
import { exportSearchParamsSchema } from '../_lib/schema'

/**
 * Export popular keywords data as CSV
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
    let keywords: PopularKeyword[]
    if (validatedParams.selectedDate) {
      keywords = await getPopularKeywords(
        validatedParams.limit,
        Temporal.PlainDate.from(validatedParams.selectedDate),
      )
    } else if (validatedParams.endDate) {
      const start = Temporal.PlainDate.from(validatedParams.startDate)
      const end = Temporal.PlainDate.from(validatedParams.endDate)
      keywords = await getPopularKeywords(validatedParams.limit, start, end)
    } else {
      keywords = await getPopularKeywords(
        validatedParams.limit,
        Temporal.PlainDate.from(validatedParams.startDate),
      )
    }

    // Check if data is available
    if (keywords.length === 0) {
      return createErrorResponse(
        'No data available for the specified date range',
        {
          status: 404,
        },
      )
    }

    // Prepare data for CSV export
    const csvData = [
      ['順位', 'キーワード', '検索回数'],
      ...keywords.map((keyword, index) => [
        index + 1,
        keyword.keyword,
        keyword.count,
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
    const filename = `search-analytics-keywords-${dateStr}.csv`

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
