/**
 * Skeleton components for loading states
 * Used with Suspense boundaries to show loading UI while data is being fetched
 */

import { range } from '@shinju-date/helpers'

interface ListCardsSkeletonProps {
  rows?: number
}

export function ListCardsSkeleton({ rows = 4 }: ListCardsSkeletonProps) {
  return (
    <div aria-hidden="true" className="animate-pulse space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="h-10 w-48 rounded-md bg-gray-200" />
        <div className="h-10 w-40 rounded-md bg-gray-200" />
      </div>
      {range(rows).map((row) => (
        <div
          className="min-h-24 rounded-lg border border-gray-200 bg-white p-4"
          key={`list-card-skeleton-${row}`}
        >
          <div className="mb-3 h-5 w-2/3 rounded bg-gray-200" />
          <div className="h-4 w-1/3 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

interface ManagementTableSkeletonProps {
  rows?: number
}

export function ManagementTableSkeleton({
  rows = 5,
}: ManagementTableSkeletonProps) {
  return (
    <div aria-hidden="true" className="animate-pulse space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div className="h-10 w-full rounded-md bg-gray-200 sm:max-w-md" />
        <div className="h-10 w-32 rounded-md bg-gray-200" />
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <div className="grid h-12 grid-cols-4 gap-4 bg-gray-50 px-4 py-3">
          {range(4).map((column) => (
            <div
              className="h-4 rounded bg-gray-200"
              key={`table-header-skeleton-${column}`}
            />
          ))}
        </div>
        {range(rows).map((row) => (
          <div
            className="grid min-h-14 grid-cols-4 items-center gap-4 border-gray-200 border-t px-4 py-3"
            key={`table-row-skeleton-${row}`}
          >
            {range(4).map((column) => (
              <div
                className="h-4 rounded bg-gray-200"
                key={`table-cell-skeleton-${row}-${column}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function TermsListSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div className="h-10 w-full rounded-md bg-gray-200 sm:max-w-md" />
        <div className="h-10 w-28 rounded-md bg-gray-200" />
      </div>
      <div className="flex min-h-16 flex-wrap gap-2 rounded-md border border-gray-200 bg-gray-50 p-3">
        {range(8).map((item) => (
          <div
            className="h-8 w-10 rounded bg-gray-200"
            key={`term-index-skeleton-${item}`}
          />
        ))}
      </div>
      {range(5).map((item) => (
        <div
          className="h-12 rounded-lg border border-gray-200 bg-gray-100"
          key={`term-group-skeleton-${item}`}
        />
      ))}
    </div>
  )
}

export function DetailCardsSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-72 max-w-full rounded bg-gray-200" />
          <div className="h-4 w-24 rounded bg-gray-100" />
        </div>
        <div className="h-10 w-32 rounded bg-gray-200" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="aspect-video rounded-lg border border-gray-200 bg-gray-100" />
        <div className="min-h-96 rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-6 h-6 w-32 rounded bg-gray-200" />
          <div className="space-y-6">
            {range(6).map((row) => (
              <div className="grid grid-cols-3 gap-4" key={`detail-row-${row}`}>
                <div className="h-4 rounded bg-gray-200" />
                <div className="col-span-2 h-4 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="h-40 rounded-lg border border-gray-200 bg-white" />
      <div className="h-40 rounded-lg border border-gray-200 bg-white" />
    </div>
  )
}

interface StackedDetailSkeletonProps {
  cards?: number
}

export function StackedDetailSkeleton({
  cards = 5,
}: StackedDetailSkeletonProps) {
  return (
    <div aria-hidden="true" className="animate-pulse space-y-6">
      {range(cards).map((card) => (
        <div
          className="min-h-36 rounded-lg border border-gray-200 bg-white p-6"
          key={`stacked-detail-skeleton-${card}`}
        >
          <div className="mb-5 h-6 w-40 rounded bg-gray-200" />
          <div className="space-y-3">
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-4 w-2/3 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function FormCardSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse space-y-4">
      <div className="h-7 w-56 rounded bg-gray-200" />
      <div className="min-h-56 space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <div className="h-12 rounded-md bg-gray-100" />
        <div className="h-5 w-48 rounded bg-gray-200" />
        <div className="h-10 rounded-md bg-gray-200" />
        <div className="h-10 w-48 rounded-md bg-gray-200" />
      </div>
    </div>
  )
}

export function DateRangePickerSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-12 animate-pulse items-center gap-3"
    >
      <div className="h-10 w-40 rounded-md bg-gray-200" />
      <div className="h-10 w-40 rounded-md bg-gray-200" />
      <div className="h-10 w-24 rounded-md bg-gray-200" />
    </div>
  )
}

export function TabNavigationSkeleton() {
  return (
    <div aria-hidden="true" className="flex h-12 animate-pulse gap-2">
      <div className="h-10 w-28 rounded-md bg-gray-200" />
      <div className="h-10 w-28 rounded-md bg-gray-200" />
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-96 animate-pulse items-end gap-3 border-gray-200 border-b border-l px-4 pt-8"
    >
      {[45, 70, 55, 85, 40, 65, 75, 50, 90, 60].map((height) => (
        <div
          className="flex-1 rounded-t bg-gray-200"
          key={`chart-bar-skeleton-${height}`}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  )
}

export function MetricCardSkeleton() {
  return (
    <div aria-hidden="true" className="min-h-64 animate-pulse space-y-5">
      <div className="h-6 w-2/3 rounded bg-gray-200" />
      <div className="h-12 w-1/2 rounded bg-gray-200" />
      <div className="space-y-3">
        {range(4).map((row) => (
          <div className="flex gap-3" key={`metric-row-skeleton-${row}`}>
            <div className="h-4 flex-1 rounded bg-gray-100" />
            <div className="h-4 w-12 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 h-6 w-32 rounded bg-gray-200" />
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-gray-100 p-4">
          <div className="mb-2 h-4 w-20 rounded bg-gray-200" />
          <div className="h-8 w-24 rounded bg-gray-200" />
        </div>
        <div className="rounded-lg bg-gray-100 p-4">
          <div className="mb-2 h-4 w-20 rounded bg-gray-200" />
          <div className="h-8 w-24 rounded bg-gray-200" />
        </div>
        <div className="rounded-lg bg-gray-100 p-4">
          <div className="mb-2 h-4 w-20 rounded bg-gray-200" />
          <div className="h-8 w-24 rounded bg-gray-200" />
        </div>
        <div className="rounded-lg bg-gray-100 p-4">
          <div className="mb-2 h-4 w-20 rounded bg-gray-200" />
          <div className="h-8 w-24 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  )
}

export function WidgetSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 h-6 w-32 rounded bg-gray-200" />
      <div className="flex flex-col gap-3">
        <div className="h-12 rounded-lg bg-gray-100" />
        <div className="h-12 rounded-lg bg-gray-100" />
        <div className="h-12 rounded-lg bg-gray-100" />
        <div className="h-12 rounded-lg bg-gray-100" />
      </div>
    </div>
  )
}

export function AnalyticsPageSkeleton() {
  return (
    <div className="animate-pulse p-6">
      <div className="mb-6 h-8 w-64 rounded bg-gray-200" />
      <div className="mb-6 flex gap-4">
        <div className="h-10 w-64 rounded bg-gray-200" />
        <div className="h-10 w-48 rounded bg-gray-200" />
      </div>
      <div className="mb-6 h-64 rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 h-6 w-32 rounded bg-gray-200" />
        <div className="h-48 rounded bg-gray-100" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 h-6 w-40 rounded bg-gray-200" />
          <div className="space-y-3">
            {range(5).map((i) => (
              <div
                className="flex items-center gap-4"
                key={`analytics-item-${i}`}
              >
                <div className="h-4 w-4 rounded-full bg-gray-200" />
                <div className="h-4 flex-1 rounded bg-gray-200" />
                <div className="h-4 w-12 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 h-6 w-40 rounded bg-gray-200" />
          <div className="space-y-3">
            {range(5).map((i) => (
              <div
                className="flex items-center gap-4"
                key={`analytics-item-2-${i}`}
              >
                <div className="h-4 w-4 rounded-full bg-gray-200" />
                <div className="h-4 flex-1 rounded bg-gray-200" />
                <div className="h-4 w-12 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface TableSkeletonProps {
  rows?: number
}

export function TableSkeleton({ rows = 5 }: TableSkeletonProps) {
  return (
    <div aria-hidden="true" className="animate-pulse overflow-x-auto">
      <table className="w-full">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="p-3 text-left">
              <div className="h-4 w-4 rounded bg-gray-200" />
            </th>
            <th className="p-3 text-left">
              <div className="h-4 w-20 rounded bg-gray-200" />
            </th>
            <th className="p-3 text-left">
              <div className="h-4 w-32 rounded bg-gray-200" />
            </th>
            <th className="p-3 text-left">
              <div className="h-4 w-24 rounded bg-gray-200" />
            </th>
            <th className="p-3 text-left">
              <div className="h-4 w-24 rounded bg-gray-200" />
            </th>
            <th className="p-3 text-left">
              <div className="h-4 w-24 rounded bg-gray-200" />
            </th>
            <th className="p-3 text-left">
              <div className="h-4 w-20 rounded bg-gray-200" />
            </th>
            <th className="p-3 text-left">
              <div className="h-4 w-20 rounded bg-gray-200" />
            </th>
            <th className="p-3 text-left">
              <div className="h-4 w-20 rounded bg-gray-200" />
            </th>
            <th className="p-3 text-left">
              <div className="h-4 w-20 rounded bg-gray-200" />
            </th>
          </tr>
        </thead>
        <tbody>
          {range(rows).map((i) => (
            <tr className="border-b" key={`skeleton-row-${i}`}>
              <td className="p-3">
                <div className="h-4 w-4 rounded bg-gray-200" />
              </td>
              <td className="p-3">
                <div className="h-16 w-28 rounded bg-gray-200" />
              </td>
              <td className="p-3">
                <div className="h-4 w-full max-w-xs rounded bg-gray-200" />
              </td>
              <td className="p-3">
                <div className="h-4 w-20 rounded bg-gray-200" />
              </td>
              <td className="p-3">
                <div className="h-4 w-24 rounded bg-gray-200" />
              </td>
              <td className="p-3">
                <div className="h-4 w-24 rounded bg-gray-200" />
              </td>
              <td className="p-3">
                <div className="h-4 w-16 rounded bg-gray-200" />
              </td>
              <td className="p-3">
                <div className="h-4 w-12 rounded bg-gray-200" />
              </td>
              <td className="p-3">
                <div className="h-6 w-16 rounded bg-gray-200" />
              </td>
              <td className="p-3">
                <div className="h-5 w-5 rounded bg-gray-200" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface PopularVideosListSkeletonProps {
  count?: number
}

export function PopularVideosListSkeleton({
  count = 10,
}: PopularVideosListSkeletonProps) {
  return (
    <div className="animate-pulse space-y-3">
      {range(count).map((i) => (
        <div
          className="flex items-center gap-4 rounded-lg border border-gray-100 p-3"
          key={`skeleton-video-${i}`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200" />
          <div className="h-16 w-28 rounded bg-gray-200" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-5 w-3/4 rounded bg-gray-200" />
            <div className="h-4 w-1/4 rounded bg-gray-200" />
          </div>
          <div className="flex shrink-0 gap-2">
            <div className="h-8 w-12 rounded bg-gray-200" />
            <div className="h-8 w-8 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  )
}
