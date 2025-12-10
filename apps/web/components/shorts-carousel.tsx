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
    <div className="w-full space-y-4">
      {/* Mobile: scroll-snap carousel, Desktop: grid */}
      <div
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth md:grid md:snap-none md:grid-cols-4 md:gap-6 md:overflow-visible"
        style={{
          // Mobile: scroll-padding-left ensures first item aligns properly
          scrollPaddingLeft: '1rem',
          scrollPaddingRight: '1rem',
        }}
      >
        {videos.map((video) => (
          <div
            // Mobile: w-[85%] with snap-start for scroll snapping
            // Desktop: normal grid item
            className="w-[85%] shrink-0 snap-start md:w-auto"
            key={video.id}
          >
            <ShortVideoCard value={video} />
          </div>
        ))}
      </div>
    </div>
  )
}
