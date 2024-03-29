import { type ComponentPropsWithoutRef } from 'react'
import { twMerge } from 'tailwind-merge'
import { type Video } from '@/lib/fetchers'
import VideoCard, { VideoCardSkeleton } from './video-card'

export function VideoCardListSkeleton({
  className
}: {
  className?: string | undefined
}) {
  return (
    <div
      className={twMerge(
        'grid grid-cols-1 gap-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3',
        className
      )}
    >
      <VideoCardSkeleton />
      <VideoCardSkeleton />
    </div>
  )
}

export default function VideoCardList({
  values,
  ...props
}: Omit<ComponentPropsWithoutRef<typeof VideoCard>, 'value'> & {
  values: Video[]
}) {
  return (
    <div className="grid grid-cols-1 gap-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {values.map((value) => (
        <VideoCard key={value.slug} value={value} {...props} />
      ))}
    </div>
  )
}
