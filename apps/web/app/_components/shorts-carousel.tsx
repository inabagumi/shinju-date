'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import VideoCard, { VideoCardSkeleton } from '@/components/video-card'
import type { Video } from '@/lib/fetchers'

const SLIDE_CLASS_NAME =
  'min-w-0 shrink-0 basis-[85%] md:basis-[calc(25%-1.125rem)]'

const NAVIGATION_BUTTON_CLASS_NAME =
  'rounded-full border border-border bg-surface p-2 text-foreground shadow-overlay transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'

export function ShortsCarouselSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden md:gap-6">
      {Array.from({ length: 4 }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: 件数が決まっていて並びも変わらないスケルトンなので、インデックスをキーにする
        <div className={SLIDE_CLASS_NAME} key={index}>
          <VideoCardSkeleton variant="short" />
        </div>
      ))}
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
      <div className="absolute top-1/2 -left-4 z-10 hidden -translate-y-1/2 md:block">
        <button
          aria-label="前へ"
          className={NAVIGATION_BUTTON_CLASS_NAME}
          disabled={!canScrollPrev}
          onClick={scrollPrev}
          type="button"
        >
          <ChevronLeft className="size-6" />
        </button>
      </div>
      <div className="absolute top-1/2 -right-4 z-10 hidden -translate-y-1/2 md:block">
        <button
          aria-label="次へ"
          className={NAVIGATION_BUTTON_CLASS_NAME}
          disabled={!canScrollNext}
          onClick={scrollNext}
          type="button"
        >
          <ChevronRight className="size-6" />
        </button>
      </div>

      {/* Carousel viewport with negative margin and full viewport width */}
      <div className="-mx-4 w-screen px-4 md:mx-0 md:w-auto md:px-0">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-4 md:gap-6">
            {videos.map((video) => (
              <div className={SLIDE_CLASS_NAME} key={video.id}>
                <VideoCard
                  dateTimeFormatOptions={{
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }}
                  value={video}
                  variant="short"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
