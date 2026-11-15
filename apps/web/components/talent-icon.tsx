import { twMerge } from '@shinju-date/ui'
import { UserRound } from 'lucide-react'
import Image from 'next/image'
import type { ProfileImage, TalentListItem } from '@/lib/fetchers'

/** `TalentDetail` and `TalentListItem` both have the accounts */
type TalentAccounts = Pick<TalentListItem, 'twitch_users' | 'youtube_channels'>

/**
 * The icon of a talent: the icon of a YouTube channel, then that of a Twitch
 * user. `null` means the default icon should be shown.
 *
 * `fetchTalent` and `fetchTalentList` sort the channels and users in the same
 * way, so a talent with several of them always gets the same icon.
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
  className?: string
  /**
   * The width and height in pixels. Omit it to set them with `className`
   * instead (to change them with the screen width), and pass `sizes`.
   */
  size?: number
  /** `sizes` of the image. Defaults to the `size` */
  sizes?: string
  talent: TalentAccounts
}

/**
 * The round icon of a talent. It is decorative, as the name of the talent is
 * always shown next to it.
 */
export default function TalentIcon({
  className,
  size,
  sizes = size ? `${size}px` : undefined,
  talent,
}: TalentIconProps) {
  const profileImage = getTalentProfileImage(talent)
  const baseClassName = twMerge(
    'relative shrink-0 overflow-hidden rounded-full bg-muted',
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
        <UserRound className="size-[70%]" strokeWidth={1.5} />
      </span>
    )
  }

  return (
    <span className={baseClassName} data-testid="talent-icon" style={style}>
      <Image
        alt=""
        blurDataURL={profileImage.blur_data_url}
        className="object-cover"
        fill
        placeholder={profileImage.blur_data_url ? 'blur' : 'empty'}
        sizes={sizes}
        src={`/images/profile-images/${profileImage.id}`}
      />
    </span>
  )
}
