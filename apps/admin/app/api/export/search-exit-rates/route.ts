import { getSearchExitRates } from "@/lib/analytics/get-search-quality-metrics";

import { createCsvExportRoute } from "../_lib/create-csv-export-route";

/**
 * Export search exit rates data as CSV
 */
export const GET = createCsvExportRoute({
  fetch: getSearchExitRates,
  filenamePrefix: "search-exit-rates-",
  header: ["順位", "キーワード", "検索回数", "離脱率"],
  toRow: (item, index) => [
    index + 1,
    item.keyword,
    item.searchCount,
    `${item.exitRate.toFixed(1)}%`,
  ],
});
