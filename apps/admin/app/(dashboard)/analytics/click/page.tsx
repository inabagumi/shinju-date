import { PageHeader } from "@shinju-date/ui";
import type { Metadata } from "next";
import { Suspense } from "react";

import { Panel } from "@/components/panel";

import {
  DateRangePickerClient,
  DateRangePickerSkeleton,
} from "../_components/date-range-picker-client";
import { RankingWidgetSkeleton } from "../_components/ranking-widget";
import {
  TabNavigation,
  TabNavigationSkeleton,
} from "../_components/tab-navigation";
import { VolumeChart, VolumeChartSkeleton } from "../_components/volume-chart";
import { analyticsSearchParamsSchema } from "../_lib/search-params-schema";
import { PopularRankingsTabs } from "./_components/popular-rankings-tabs";

export const metadata: Metadata = {
  title: "クリックアナリティクス",
};

const RANKING_TABS = [
  { id: "videos", label: "人気動画" },
  { id: "talents", label: "人気タレント" },
];

export default function ClickAnalyticsPage({
  searchParams,
}: PageProps<"/analytics/click">) {
  const parsedSearchParams = searchParams.then((params) =>
    analyticsSearchParamsSchema.parse(params)
  );

  return (
    <div>
      <PageHeader title="クリックアナリティクス" />

      <div className="mb-8">
        <Suspense fallback={<DateRangePickerSkeleton />}>
          <DateRangePickerClient searchParams={parsedSearchParams} />
        </Suspense>
      </div>

      <section className="mb-8">
        <h2 className="mb-4 text-heading font-bold">クリックボリューム</h2>
        <Panel>
          <Suspense fallback={<VolumeChartSkeleton />}>
            <VolumeChart kind="click" searchParams={parsedSearchParams} />
          </Suspense>
        </Panel>
      </section>

      <section>
        <h2 className="mb-4 text-heading font-bold">人気ランキング</h2>
        <Panel>
          <Suspense fallback={<TabNavigationSkeleton tabs={RANKING_TABS} />}>
            <TabNavigation
              defaultTab="videos"
              searchParams={parsedSearchParams}
              tabs={RANKING_TABS}
            />
          </Suspense>
          <div className="mt-6">
            <Suspense
              fallback={<RankingWidgetSkeleton title="人気動画ランキング" />}
            >
              <PopularRankingsTabs searchParams={parsedSearchParams} />
            </Suspense>
          </div>
        </Panel>
      </section>
    </div>
  );
}
