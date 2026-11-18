import { Activity, Suspense } from "react";

import { RankingWidgetSkeleton } from "../../_components/ranking-widget";
import type { AnalyticsSearchParams } from "../../_lib/search-params-schema";
import { PopularTalentsWidget } from "./popular-talents-widget";
import { PopularVideosWidget } from "./popular-videos-widget";

interface Props {
  searchParams: Promise<AnalyticsSearchParams>;
}

/**
 * Server component that renders popular videos and talents tabs
 * Uses Activity component to show/hide content based on tab parameter
 */
export async function PopularRankingsTabs({ searchParams }: Props) {
  const { tab } = await searchParams;
  const activeTab = tab || "videos";

  return (
    <div>
      <Activity mode={activeTab === "videos" ? "visible" : "hidden"}>
        <Suspense
          fallback={<RankingWidgetSkeleton title="人気動画ランキング" />}
        >
          <PopularVideosWidget searchParams={searchParams} />
        </Suspense>
      </Activity>

      <Activity mode={activeTab === "talents" ? "visible" : "hidden"}>
        <Suspense
          fallback={<RankingWidgetSkeleton title="人気タレントランキング" />}
        >
          <PopularTalentsWidget searchParams={searchParams} />
        </Suspense>
      </Activity>
    </div>
  );
}
