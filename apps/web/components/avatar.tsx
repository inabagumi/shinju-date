import { twMerge } from '@shinju-date/ui'
import { UserRound } from 'lucide-react'
import Image from 'next/image'
import type { ReactNode } from 'react'
import type { ProfileImage } from '@/lib/fetchers'

interface AvatarProps {
  /**
   * The alternative text. Leave it empty when the name is shown next to the
   * avatar, as screen readers would announce it twice.
   */
  alt?: string | undefined
  className?: string | undefined
  /** Shown in place of the image when there is none */
  fallback?: ReactNode
  /** `data-testid` of the element shown when there is no image */
  fallbackTestId?: string | undefined
  image: ProfileImage | null
  /** `data-testid` of the element of the image */
  imageTestId?: string | undefined
  /**
   * The width and height in pixels. Omit it to set them with `className`
   * instead (to change them with the screen width), and pass `sizes`.
   */
  size?: number | undefined
  /** `sizes` of the image. Defaults to the `size` */
  sizes?: string | undefined
}

/**
 * A round profile image, or a default icon when there is no image.
 */
export default function Avatar({
  alt = '',
  className,
  fallback = <UserRound className="size-[70%]" strokeWidth={1.5} />,
  fallbackTestId,
  image,
  imageTestId,
  size,
  sizes = size ? `${size}px` : undefined,
}: AvatarProps) {
  const baseClassName = twMerge(
    'relative shrink-0 overflow-hidden rounded-full bg-muted',
    className,
  )
  const style = size ? { height: size, width: size } : undefined

  if (!image) {
    return (
      <span
        className={twMerge(
          baseClassName,
          'flex items-center justify-center text-muted',
        )}
        data-testid={fallbackTestId}
        style={style}
        {...(alt
          ? ({ 'aria-label': alt, role: 'img' } as const)
          : ({ 'aria-hidden': true } as const))}
      >
        {fallback}
      </span>
    )
  }

  return (
    <span className={baseClassName} data-testid={imageTestId} style={style}>
      <Image
        alt={alt}
        blurDataURL={image.blur_data_url}
        className="object-cover"
        fill
        placeholder={image.blur_data_url ? 'blur' : 'empty'}
        sizes={sizes}
        src={`/images/profile-images/${image.id}`}
      />
    </span>
  )
}
