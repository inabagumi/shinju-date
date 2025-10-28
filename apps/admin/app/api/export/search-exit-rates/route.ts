import { type NextRequest, NextResponse } from 'next/server'
import { Temporal } from 'temporal-polyfill'
import { getSearchExitRates } from '@/lib/analytics/get-search-quality-metrics'

type SearchExitRate = {
  keyword: string
  exitRate: number
  searchCount: number
}

/**
 * Export search exit rates data as CSV
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Get query parameters
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const selectedDate = searchParams.get('selectedDate')
    const limit = Number.parseInt(searchParams.get('limit') || '50', 10)

    // Validate required parameters
    if (!startDate) {
      return NextResponse.json(
        { error: 'startDate parameter is required' },
        { status: 400 },
      )
    }

    // Fetch data based on parameters
    let exitRates: SearchExitRate[]
    if (selectedDate) {
      exitRates = await getSearchExitRates(
        Temporal.PlainDate.from(selectedDate),
        undefined,
        limit,
      )
    } else if (endDate) {
      const start = Temporal.PlainDate.from(startDate)
      const end = Temporal.PlainDate.from(endDate)
      exitRates = await getSearchExitRates(start, end, limit)
    } else {
      exitRates = await getSearchExitRates(
        Temporal.PlainDate.from(startDate),
        undefined,
        limit,
      )
    }

    // Generate CSV content
    const csvData = exitRates.map((item, index) => ({
      キーワード: item.keyword,
      検索回数: item.searchCount,
      離脱率: `${item.exitRate.toFixed(1)}%`,
      順位: index + 1,
    }))

    if (csvData.length === 0) {
      return NextResponse.json(
        { error: 'No data available for the specified date range' },
        { status: 404 },
      )
    }

    // Convert to CSV format
    const headers = Object.keys(csvData[0])
    const csvContent = [
      // Header row
      headers.join(','),
      // Data rows
      ...csvData.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row]
            // Escape values containing commas or quotes
            if (
              typeof value === 'string' &&
              (value.includes(',') || value.includes('"'))
            ) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          })
          .join(','),
      ),
    ].join('\n')

    // Generate filename
    const dateStr = selectedDate || `${startDate}_${endDate || startDate}`
    const filename = `search-exit-rates-${dateStr}.csv`

    // Return CSV response
    return new NextResponse(`\uFEFF${csvContent}`, {
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'text/csv;charset=utf-8',
      },
    })
  } catch (error) {
    console.error('CSV export error:', error)
    return NextResponse.json(
      { error: 'Failed to generate CSV export' },
      { status: 500 },
    )
  }
}
