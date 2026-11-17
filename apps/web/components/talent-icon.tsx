import type { ProfileImage, TalentListItem } from '@/lib/fetchers'
import Avatar from './avatar'

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
  sizes,
  talent,
}: TalentIconProps) {
  return (
    <Avatar
      className={className}
      fallbackTestId="talent-default-icon"
      image={getTalentProfileImage(talent)}
      imageTestId="talent-icon"
      size={size}
      sizes={sizes}
    />
  )
}
