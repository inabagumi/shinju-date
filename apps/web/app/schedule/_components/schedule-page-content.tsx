import { Suspense } from 'react'
import PageHeader from '@/components/page-header'
import { MAIN_CONTENT_ID } from '@/components/skip-link'
import {
  AdjacentWeekLink,
  AdjacentWeekLinkSkeleton,
  CurrentWeekLink,
  ScheduleDays,
  ScheduleDaysSkeleton,
  type ScheduleWeekSectionProps,
  ScheduleWeekTitle,
  ScheduleWeekTitleSkeleton,
} from './schedule-week'

/**
 * `/schedule` と `/schedule/[date]` の中身。ページ見出しと週の移動の枠は
 * 静的なシェルに入れ、表示する週で変わる部分だけを Suspense の中に置く。
 */
export default function SchedulePageContent({
  params,
}: ScheduleWeekSectionProps) {
  return (
    <main
      className="mx-auto max-w-6xl scroll-mt-20 px-4 py-8"
      id={MAIN_CONTENT_ID}
    >
      <PageHeader
        breadcrumbs={[{ name: '配信スケジュール' }]}
        description={
          <p>1週間ぶんの配信と動画を、開始日時の日付ごとに並べています。</p>
        }
        title="配信スケジュール"
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Suspense fallback={<ScheduleWeekTitleSkeleton />}>
          <ScheduleWeekTitle params={params} />
        </Suspense>

        <nav aria-label="週の移動">
          <ul className="flex items-center gap-4 text-meta">
            <li>
              <Suspense
                fallback={<AdjacentWeekLinkSkeleton direction="previous" />}
              >
                <AdjacentWeekLink direction="previous" params={params} />
              </Suspense>
            </li>
            <li>
              <CurrentWeekLink />
            </li>
            <li>
              <Suspense
                fallback={<AdjacentWeekLinkSkeleton direction="next" />}
              >
                <AdjacentWeekLink direction="next" params={params} />
              </Suspense>
            </li>
          </ul>
        </nav>
      </div>

      <Suspense fallback={<ScheduleDaysSkeleton />}>
        <ScheduleDays params={params} />
      </Suspense>
    </main>
  )
}
