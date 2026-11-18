import { Suspense } from "react";

import PageHeader from "@/components/page-header";
import PageMain from "@/components/page-main";

import {
  ScheduleDays,
  ScheduleDaysSkeleton,
  ScheduleWeekdayBand,
  ScheduleWeekdayBandSkeleton,
  ScheduleWeekNavigation,
  ScheduleWeekNavigationSkeleton,
  type ScheduleWeekSectionProps,
} from "./schedule-week";

/**
 * `/schedule` と `/schedule/[date]` の中身。2つのルートの違いは「どの週か」の
 * 決め方だけで、ページ見出しを静的なシェルに入れ、週で変わる部分をそれぞれ
 * Suspense の中に置く。
 */
export default function SchedulePageContent({
  params,
}: ScheduleWeekSectionProps) {
  return (
    <PageMain>
      <PageHeader
        breadcrumbs={[{ name: "配信スケジュール" }]}
        title="配信スケジュール"
      />

      <Suspense fallback={<ScheduleWeekNavigationSkeleton />}>
        <ScheduleWeekNavigation params={params} />
      </Suspense>

      <Suspense fallback={<ScheduleWeekdayBandSkeleton />}>
        <ScheduleWeekdayBand params={params} />
      </Suspense>

      <Suspense fallback={<ScheduleDaysSkeleton />}>
        <ScheduleDays params={params} />
      </Suspense>
    </PageMain>
  );
}
