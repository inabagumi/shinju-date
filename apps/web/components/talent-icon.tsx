import { twMerge } from '@shinju-date/ui'
import { UserRound } from 'lucide-react'
import Image from 'next/image'
import type { ProfileImage } from '@/lib/fetchers'

interface TalentAccount {
  profile_image: ProfileImage | null
}

/** The accounts of a talent, of which only the icons are used */
export interface TalentAccounts {
  twitch_users: TalentAccount[]
  youtube_channels: TalentAccount[]
}

/**
 * The icon of a talent: the icon of a YouTube channel, then that of a Twitch
 * user. `null` means the default icon should be shown.
 *
 * `fetchTalent` and `fetchTalentSummaries` sort the channels and users, so a
 * talent with several of them always gets the same icon.
 */
export function getTalentProfileImage(
  talent: TalentAccounts,
): ProfileImage | null {
  const accounts = [...talent.youtube_channels, ...talent.twitch_users]

  return (
    accounts.find((account) => account.profile_image)?.profile_image ?? null
  )
}

interface TalentIconProps {
  /** Classes of the round frame. Set the size here when `size` is omitted */
  className?: string
  /** Classes of the image, or of the default icon, inside the frame */
  imageClassName?: string
  /**
   * The width and height in pixels. Omit it to set the size with
   * `className`, and pass `sizes` instead.
   */
  size?: number
  /** The `sizes` of the image. Defaults to `size` */
  sizes?: string
  talent: TalentAccounts
}

/**
 * The round icon of a talent. It is decorative, as the name of the talent is
 * always shown next to it.
 */
export default function TalentIcon({
  className,
  imageClassName,
  size,
  sizes = size ? `${size}px` : undefined,
  talent,
}: TalentIconProps) {
  const profileImage = getTalentProfileImage(talent)
  // `isolate` keeps the frame round while the image is scaled in Safari
  const baseClassName = twMerge(
    'relative isolate shrink-0 overflow-hidden rounded-full bg-muted',
    className,
  )
  const style = size ? { height: size, width: size } : undefined

  if (!profileImage) {
    return (
      <span
        aria-hidden="true"
        className={twMerge(
          baseClassName,
          'flex items-center justify-center text-muted',
        )}
        data-testid="talent-default-icon"
        style={style}
      >
        <UserRound
          className={twMerge('size-[70%]', imageClassName)}
          strokeWidth={1.5}
        />
      </span>
    )
  }

  return (
    <span className={baseClassName} data-testid="talent-icon" style={style}>
      <Image
        alt=""
        blurDataURL={profileImage.blur_data_url}
        className={twMerge('object-cover', imageClassName)}
        fill
        placeholder={profileImage.blur_data_url ? 'blur' : 'empty'}
        sizes={sizes}
        src={`/images/profile-images/${profileImage.id}`}
      />
    </span>
  )
}
