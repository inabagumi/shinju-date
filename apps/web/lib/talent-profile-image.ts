import type { ProfileImage, TalentListItem } from "@/lib/data/talents";

/** `TalentDetail` and `TalentListItem` both have the accounts */
export type TalentAccounts = Pick<
  TalentListItem,
  "twitch_users" | "youtube_channels"
>;

/**
 * The icon of a talent: the icon of a YouTube channel, then that of a Twitch
 * user. `null` means the default icon should be shown.
 *
 * `fetchTalent` and `fetchTalentList` sort the channels and users in the same
 * way, so a talent with several of them always gets the same icon.
 */
export const getTalentProfileImage = (
  talent: TalentAccounts
): ProfileImage | null => {
  const accounts = [...talent.youtube_channels, ...talent.twitch_users];

  return (
    accounts.find((account) => account.profile_image)?.profile_image ?? null
  );
};
