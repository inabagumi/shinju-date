import { getPopularKeywords } from "@/lib/analytics/get-popular-keywords";

import { RankingWidget } from "../../_components/ranking-widget";
import { formatDateLabel } from "../../_lib/format-date";
import { resolvePeriod } from "../../_lib/resolve-period";
import type { AnalyticsSearchParams } from "../../_lib/search-params-schema";

interface Props {
  searchParams: Promise<AnalyticsSearchParams>;
}

/** 最も検索されたキーワードのランキング */
export const PopularKeywordsWidget = async ({ searchParams }: Props) => {
  const { dateRange, selectedDate } = await searchParams;
  const range = resolvePeriod({ dateRange, selectedDate });
  const keywords = await getPopularKeywords({ limit: 20, range });

  return (
    <RankingWidget
      dateRange={dateRange}
      description={
        selectedDate
          ? `${formatDateLabel(selectedDate)}に検索されたキーワードのランキング。同じ日付をもう一度クリックすると期間全体の表示に戻ります。`
          : `${formatDateLabel(dateRange.startDate)}から${formatDateLabel(dateRange.endDate)}の期間で最も検索されたキーワードのランキング。グラフの日付をクリックすると、その日のランキングが表示されます。`
      }
      exportType="keywords"
      getKey={(item) => item.keyword}
      getLabel={(item) => item.keyword}
      getValue={(item) => item.count}
      labelHeading="キーワード"
      rows={keywords}
      selectedDate={selectedDate}
      title="人気キーワードランキング"
      valueHeading="検索回数"
    />
  );
};
