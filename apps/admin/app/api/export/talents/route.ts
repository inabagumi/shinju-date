import { getPopularTalents } from "@/lib/analytics/get-popular-talents";

import { createCsvExportRoute } from "../_lib/create-csv-export-route";

/**
 * Export popular talents data as CSV
 */
export const GET = createCsvExportRoute({
  fetch: getPopularTalents,
  filenamePrefix: "click-analytics-talent-",
  header: ["順位", "タレント名", "クリック数"],
  toRow: (talent, index) => [index + 1, talent.name, talent.clicks],
});
