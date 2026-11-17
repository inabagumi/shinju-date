import { getPopularKeywords } from '@/lib/analytics/get-popular-keywords'
import { createCsvExportRoute } from '../_lib/create-csv-export-route'

/**
 * Export popular keywords data as CSV
 */
export const GET = createCsvExportRoute({
  fetch: getPopularKeywords,
  filenamePrefix: 'search-analytics-keywords-',
  header: ['順位', 'キーワード', '検索回数'],
  toRow: (keyword, index) => [index + 1, keyword.keyword, keyword.count],
})
