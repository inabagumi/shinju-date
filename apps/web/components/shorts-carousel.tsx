'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback } from 'react'
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
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: false,
    slidesToScroll: 1,
  })

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext()
  }, [emblaApi])

  if (videos.length === 0) {
    return null
  }

  return (
    <div className="relative space-y-4">
      {/* Desktop navigation buttons - only show on medium screens and up */}
      <div className="-left-4 -translate-y-1/2 absolute top-1/2 z-10 hidden md:block">
        <button
          aria-label="前へ"
          className="rounded-full bg-774-nevy-100 p-2 shadow-lg transition-colors hover:bg-774-nevy-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          onClick={scrollPrev}
          type="button"
        >
          <ChevronLeft className="size-6" />
        </button>
      </div>
      <div className="-right-4 -translate-y-1/2 absolute top-1/2 z-10 hidden md:block">
        <button
          aria-label="次へ"
          className="rounded-full bg-774-nevy-100 p-2 shadow-lg transition-colors hover:bg-774-nevy-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          onClick={scrollNext}
          type="button"
        >
          <ChevronRight className="size-6" />
        </button>
      </div>

      {/* Carousel viewport */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3 md:gap-6">
          {videos.map((video) => (
            <div
              className="min-w-0 flex-[0_0_100%] md:flex-[0_0_calc(25%-1.125rem)]"
              key={video.id}
            >
              <ShortVideoCard value={video} />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: Show scroll indicators or touch instruction */}
      <div className="text-center text-774-nevy-600 text-sm md:hidden dark:text-zinc-400">
        スワイプして他のショート動画を見る
      </div>
    </div>
  )
}
