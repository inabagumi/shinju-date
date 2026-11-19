import { getPopularVideos } from "@/lib/analytics/get-popular-videos";

import { RankingWidget } from "../../_components/ranking-widget";
import { resolvePeriod } from "../../_lib/resolve-period";
import type { AnalyticsSearchParams } from "../../_lib/search-params-schema";

interface Props {
  searchParams: Promise<AnalyticsSearchParams>;
}

/** 最もクリックされている動画のランキング */
export const PopularVideosWidget = async ({ searchParams }: Props) => {
  const { dateRange, selectedDate } = await searchParams;
  const range = resolvePeriod({ dateRange, selectedDate });
  const videos = await getPopularVideos({ limit: 20, range });

  return (
    <RankingWidget
      dateRange={dateRange}
      description="最もクリックされている動画のランキング。ユーザーの興味を把握できます。"
      exportType="videos"
      getHref={(video) => `/videos/${video.id}`}
      getKey={(video) => video.id}
      getLabel={(video) => video.title}
      getValue={(video) => video.clicks}
      labelHeading="動画"
      rows={videos}
      selectedDate={selectedDate}
      title="人気動画ランキング"
      valueHeading="クリック数"
    />
  );
};
