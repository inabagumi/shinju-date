/**
 * Skeleton components for loading states
 * Used with Suspense boundaries to show loading UI while data is being fetched
 */

import { range } from '@shinju-date/helpers'

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

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse overflow-x-auto">
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

export function PopularVideosListSkeleton({ count = 10 }: { count?: number }) {
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
