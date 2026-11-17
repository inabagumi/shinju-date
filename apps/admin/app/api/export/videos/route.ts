import { getPopularVideos } from '@/lib/analytics/get-popular-videos'
import { createCsvExportRoute } from '../_lib/create-csv-export-route'

/**
 * Export popular videos data as CSV
 */
export const GET = createCsvExportRoute({
  fetch: getPopularVideos,
  filenamePrefix: 'click-analytics-videos-',
  header: ['順位', 'タイトル', 'YouTube動画ID', 'クリック数'],
  toRow: (video, index) => [
    index + 1,
    video.title,
    video.youtube_video?.youtube_video_id || 'N/A',
    video.clicks,
  ],
})
