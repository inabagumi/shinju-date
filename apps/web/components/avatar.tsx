import { twMerge } from "@shinju-date/ui";
import { UserRound } from "lucide-react";
import Image from "next/image";
import type { ComponentPropsWithoutRef } from "react";

import type { ProfileImage } from "@/lib/data/talents";

interface AvatarProps extends ComponentPropsWithoutRef<"span"> {
  /**
   * The width and height in pixels. Omit it to set them with `className`
   * instead (to change them with the screen width).
   */
  size?: number | undefined;
}

/**
 * The round frame of a profile image. Put `AvatarImage` in it, or
 * `AvatarFallback` when there is no image.
 */
export const Avatar = ({ className, size, style, ...props }: AvatarProps) => (
  <span
    className={twMerge(
      "relative shrink-0 overflow-hidden rounded-full bg-muted",
      className
    )}
    style={size ? { height: size, width: size, ...style } : style}
    {...props}
  />
);

interface AvatarImageProps {
  /**
   * The alternative text. Leave it empty when the name is shown next to the
   * avatar, as screen readers would announce it twice.
   */
  alt?: string | undefined;
  image: ProfileImage;
  /** `sizes` of the image, such as `20px` for an avatar of 20px */
  sizes?: string | undefined;
}

/** The profile image, filling `Avatar` */
export const AvatarImage = ({ alt = "", image, sizes }: AvatarImageProps) => (
  <Image
    alt={alt}
    blurDataURL={image.blur_data_url}
    className="object-cover"
    fill
    placeholder={image.blur_data_url ? "blur" : "empty"}
    sizes={sizes}
    src={`/images/profile-images/${image.id}`}
  />
);

/**
 * Shown in `Avatar` when there is no image: the default icon, or the
 * `children`. It is decorative.
 */
export const AvatarFallback = ({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"span">) => (
  <span
    aria-hidden="true"
    className={twMerge(
      "flex size-full items-center justify-center text-muted",
      className
    )}
    {...props}
  >
    {children ?? <UserRound className="size-[70%]" strokeWidth={1.5} />}
  </span>
);
