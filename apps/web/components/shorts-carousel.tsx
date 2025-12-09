'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
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

  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext()
  }, [emblaApi])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return

    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)

    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])

  if (videos.length === 0) {
    return null
  }

  return (
    <div className="relative w-full space-y-4">
      {/* Desktop navigation buttons - only show on medium screens and up */}
      <div className="-left-4 -translate-y-1/2 absolute top-1/2 z-10 hidden md:block">
        <button
          aria-label="前へ"
          className="rounded-full bg-774-nevy-100 p-2 shadow-lg transition-colors hover:bg-774-nevy-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          disabled={!canScrollPrev}
          onClick={scrollPrev}
          type="button"
        >
          <ChevronLeft className="size-6" />
        </button>
      </div>
      <div className="-right-4 -translate-y-1/2 absolute top-1/2 z-10 hidden md:block">
        <button
          aria-label="次へ"
          className="rounded-full bg-774-nevy-100 p-2 shadow-lg transition-colors hover:bg-774-nevy-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          disabled={!canScrollNext}
          onClick={scrollNext}
          type="button"
        >
          <ChevronRight className="size-6" />
        </button>
      </div>

      {/* Carousel viewport with side padding on mobile for navigation buttons */}
      <div className="relative px-12 md:px-0">
        {/* Mobile navigation buttons */}
        <div className="-translate-y-1/2 absolute top-1/2 left-0 z-10 md:hidden">
          <button
            aria-label="前へ"
            className="rounded-full bg-774-nevy-100 p-2 shadow-lg transition-colors hover:bg-774-nevy-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            disabled={!canScrollPrev}
            onClick={scrollPrev}
            type="button"
          >
            <ChevronLeft className="size-5" />
          </button>
        </div>
        <div className="-translate-y-1/2 absolute top-1/2 right-0 z-10 md:hidden">
          <button
            aria-label="次へ"
            className="rounded-full bg-774-nevy-100 p-2 shadow-lg transition-colors hover:bg-774-nevy-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            disabled={!canScrollNext}
            onClick={scrollNext}
            type="button"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-3 md:gap-6">
            {videos.map((video) => (
              <div
                className="min-w-0 shrink-0 basis-[calc(100%-3rem)] md:basis-[calc(25%-1.125rem)]"
                key={video.id}
              >
                <ShortVideoCard value={video} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
