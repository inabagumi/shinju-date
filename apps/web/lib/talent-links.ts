import type { TalentDetail } from "@/lib/data/talents";
import { VIDEO_KIND_SEARCH_PARAM } from "@/lib/video-kind-filter";
import type { VideoKindFilter } from "@/lib/video-kind-filter";

export interface TalentLink {
  /** Whether the link leads outside of this site */
  external: boolean;
  href: string;
  label: string;
}

/** The first value that is not blank, trimmed, or `null` without any */
export function findFirstNonBlank(
  ...values: (string | null | undefined)[]
): string | null {
  for (const value of values) {
    const trimmed = value?.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

/**
 * The label of an account link. When the talent has several accounts on the
 * same platform, the name of each account is added so they can be told apart.
 */
function getAccountLabel(
  baseLabel: string,
  accountName: string,
  count: number
): string {
  return count > 1 ? `${baseLabel}（${accountName}）` : baseLabel;
}

/**
 * The links shown under the name of a talent: the YouTube channels, the
 * Twitch channels, and the calendar of the talent's videos.
 */
export function getTalentLinks(talent: TalentDetail): TalentLink[] {
  const youtubeChannels = talent.youtube_channels;
  // Twitch users without a login have no channel page to link to
  const twitchUsers = talent.twitch_users.flatMap((user) => {
    const login = findFirstNonBlank(user.twitch_login_name);

    return login ? [{ ...user, twitch_login_name: login }] : [];
  });

  return [
    ...youtubeChannels.map((channel) => ({
      external: true,
      href: `https://www.youtube.com/channel/${encodeURIComponent(channel.youtube_channel_id)}`,
      label: getAccountLabel(
        "YouTube チャンネル",
        findFirstNonBlank(channel.name, channel.youtube_handle) ??
          channel.youtube_channel_id,
        youtubeChannels.length
      ),
    })),
    ...twitchUsers.map((user) => ({
      external: true,
      href: `https://www.twitch.tv/${encodeURIComponent(user.twitch_login_name)}`,
      label: getAccountLabel(
        "Twitch チャンネル",
        findFirstNonBlank(user.name) ?? user.twitch_login_name,
        twitchUsers.length
      ),
    })),
    {
      external: false,
      href: getTalentCalendarPath(talent.id),
      label: "カレンダーに登録",
    },
  ];
}

/**
 * The path of a talent's page, narrowed to the given kind of videos. `all`
 * adds no search parameter.
 */
export function getTalentPath(
  id: string,
  kind: VideoKindFilter = "all"
): string {
  const pathname = `/talents/${encodeURIComponent(id)}`;

  if (kind === "all") {
    return pathname;
  }

  return `${pathname}?${new URLSearchParams({ [VIDEO_KIND_SEARCH_PARAM]: kind })}`;
}

/** The path of a talent's calendar, the alternate of the talent's page */
export function getTalentCalendarPath(id: string): string {
  return `/talents/${encodeURIComponent(id)}.ics`;
}
