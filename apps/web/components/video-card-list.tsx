import { type ComponentPropsWithoutRef } from 'react'
import { twMerge } from 'tailwind-merge'
import { type Video } from '@/lib/fetchers'
import VideoCard, { VideoCardSkeleton } from './video-card'

type VideoCardListSkeletonProps = {
  className?: string | undefined
}

export function VideoCardListSkeleton({
  className
}: VideoCardListSkeletonProps) {
  return (
    <div
      className={twMerge(
        'grid grid-cols-1 gap-6 gap-y-12 md:grid-cols-3',
        className
      )}
    >
      <VideoCardSkeleton />
      <VideoCardSkeleton />
    </div>
  )
}

type Props = Omit<ComponentPropsWithoutRef<typeof VideoCard>, 'value'> & {
  values: Video[]
}

export default function VideoCardList({ values, ...props }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
      {values.map((value) => (
        <VideoCard key={value.slug} value={value} {...props} />
      ))}
    </div>
  )
}
