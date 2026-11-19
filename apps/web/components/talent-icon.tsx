import { getTalentProfileImage } from "@/lib/talent-profile-image";
import type { TalentAccounts } from "@/lib/talent-profile-image";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

interface TalentIconProps {
  className?: string;
  /**
   * The width and height in pixels. Omit it to set them with `className`
   * instead (to change them with the screen width), and pass `sizes`.
   */
  size?: number;
  /** `sizes` of the image. Defaults to the `size` */
  sizes?: string;
  talent: TalentAccounts;
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
  const profileImage = getTalentProfileImage(talent);
  const imageSizes = sizes ?? (size ? `${size}px` : undefined);

  return (
    <Avatar
      aria-hidden="true"
      className={className}
      data-testid={profileImage ? "talent-icon" : "talent-default-icon"}
      size={size}
    >
      {profileImage ? (
        <AvatarImage image={profileImage} sizes={imageSizes} />
      ) : (
        <AvatarFallback />
      )}
    </Avatar>
  );
}
