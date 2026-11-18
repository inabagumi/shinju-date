"use client";

import { range } from "@shinju-date/helpers";
import { Skeleton } from "@shinju-date/ui";
import { useSearchParams } from "next/navigation";
import { use } from "react";

import { useUpdateSearchParams } from "@/lib/use-update-search-params";

import { getDateRangeUpdates } from "../_lib/analytics-url-params";
import type { AnalyticsSearchParams } from "../_lib/search-params-schema";
import DateRangePicker from "./date-range-picker";
import type { DateRange } from "./date-range-picker";

interface Props {
  searchParams: Promise<AnalyticsSearchParams>;
}

/**
 * Client component wrapper for DateRangePicker that handles URL navigation
 */
export function DateRangePickerClient({ searchParams }: Props) {
  const urlSearchParams = useSearchParams();
  const updateSearchParams = useUpdateSearchParams();
  const { dateRange } = use(searchParams);

  const handleDateRangeChange = (newDateRange: DateRange) => {
    updateSearchParams(
      getDateRangeUpdates(urlSearchParams.get("date"), newDateRange)
    );
  };

  return <DateRangePicker onChange={handleDateRangeChange} value={dateRange} />;
}

/**
 * 読み込み中の `DateRangePickerClient`。期間の5つのプリセット、カスタム期間のボタン、
 * 現在の期間の注記を並べる
 */
export function DateRangePickerSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="rounded-container border border-border bg-surface p-4"
    >
      <h2 className="mb-3 text-meta font-semibold">期間選択</h2>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {range(5).map((preset) => (
            <Skeleton
              className="h-7 w-24"
              key={`date-range-preset-skeleton-${preset}`}
            />
          ))}
        </div>
        <Skeleton className="h-7 w-full" />
      </div>
      <div className="mt-3 space-y-0.5">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  );
}
