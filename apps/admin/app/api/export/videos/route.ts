import { createErrorResponse } from '@shinju-date/helpers'
import { stringify } from 'csv-stringify/sync'
import { type NextRequest, NextResponse } from 'next/server'
import { Temporal } from 'temporal-polyfill'
import {
  getPopularVideos,
  type PopularVideo,
} from '@/lib/analytics/get-popular-videos'
import { exportSearchParamsSchema } from '../_lib/schema'

/**
 * Export popular videos data as CSV
 */
export async function GET(request: NextRequest) {
  try {
    // Parse and validate query parameters
    const searchParams = Object.fromEntries(
      request.nextUrl.searchParams.entries(),
    )
    const validatedParams = exportSearchParamsSchema.parse(searchParams)

    // Fetch data based on parameters
    let videos: PopularVideo[]
    if (validatedParams.selectedDate) {
      videos = await getPopularVideos(
        validatedParams.limit,
        Temporal.PlainDate.from(validatedParams.selectedDate),
      )
    } else if (validatedParams.endDate) {
      const start = Temporal.PlainDate.from(validatedParams.startDate)
      const end = Temporal.PlainDate.from(validatedParams.endDate)
      videos = await getPopularVideos(validatedParams.limit, start, end)
    } else {
      videos = await getPopularVideos(
        validatedParams.limit,
        Temporal.PlainDate.from(validatedParams.startDate),
      )
    }

    // Check if data is available
    if (videos.length === 0) {
      return createErrorResponse(
        'No data available for the specified date range',
        {
          status: 404,
        },
      )
    }

    // Prepare data for CSV export
    const csvData = [
      ['順位', 'タイトル', 'YouTube動画ID', 'クリック数'],
      ...videos.map((video, index) => [
        index + 1,
        video.title,
        video.youtube_video?.youtube_video_id || 'N/A',
        video.clicks,
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
    const filename = `click-analytics-videos-${dateStr}.csv`

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
