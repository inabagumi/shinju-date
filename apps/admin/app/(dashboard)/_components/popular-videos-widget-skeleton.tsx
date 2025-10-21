import { PopularVideosListSkeleton } from '@/components/skeletons'

export function PopularVideosWidgetSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-full">
      <div className="mb-4 h-6 w-64 rounded bg-gray-200" />
      <PopularVideosListSkeleton />
    </div>
  )
}
