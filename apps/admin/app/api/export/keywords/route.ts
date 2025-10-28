import { type NextRequest, NextResponse } from 'next/server'
import { Temporal } from 'temporal-polyfill'
import {
  getPopularKeywords,
  type PopularKeyword,
} from '@/lib/analytics/get-popular-keywords'

/**
 * Export popular keywords data as CSV
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
    let keywords: PopularKeyword[]
    if (selectedDate) {
      keywords = await getPopularKeywords(
        limit,
        Temporal.PlainDate.from(selectedDate),
      )
    } else if (endDate) {
      const start = Temporal.PlainDate.from(startDate)
      const end = Temporal.PlainDate.from(endDate)
      keywords = await getPopularKeywords(limit, start, end)
    } else {
      keywords = await getPopularKeywords(
        limit,
        Temporal.PlainDate.from(startDate),
      )
    }

    // Generate CSV content
    const csvData = keywords.map((keyword, index) => ({
      キーワード: keyword.keyword,
      検索回数: keyword.count,
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
    const filename = `search-analytics-keywords-${dateStr}.csv`

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
