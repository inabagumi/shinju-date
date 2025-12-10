import type { Video } from '@/lib/fetchers'
import ShortVideoCard, { ShortVideoCardSkeleton } from './short-video-card'

export function ShortsCarouselSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:gap-6">
        <ShortVideoCardSkeleton />
        <ShortVideoCardSkeleton />
        <ShortVideoCardSkeleton />
        <ShortVideoCardSkeleton />
      </div>
    </div>
  )
}

export default function ShortsCarousel({ videos }: { videos: Video[] }) {
  if (videos.length === 0) {
    return null
  }

  return (
    <div className="-mx-4 md:mx-0">
      <div
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 md:grid md:snap-none md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0"
        style={{
          scrollPaddingLeft: '1rem',
          scrollPaddingRight: '1rem',
        }}
      >
        {videos.map((video) => (
          <div className="w-[85%] shrink-0 snap-start md:w-auto" key={video.id}>
            <ShortVideoCard value={video} />
          </div>
        ))}
      </div>
    </div>
  )
}
