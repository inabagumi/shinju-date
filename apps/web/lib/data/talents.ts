"use server";

import { CACHE_TAGS, TIME_ZONE } from "@shinju-date/constants";
import type { Tables } from "@shinju-date/database";
import { logger } from "@shinju-date/logger";
import { startOfHour, toDBString } from "@shinju-date/temporal-fns";
import { cacheLife, cacheTag } from "next/cache";

import { unwrap } from "@/lib/data/unwrap";
import { STREAM_TENDENCY_DAYS } from "@/lib/stream-tendency";
import { supabaseClient } from "@/lib/supabase";
import { isUUID } from "@/lib/uuid";

export type Talent = Pick<Tables<"talents">, "id" | "name">;

/**
 * Icon of a YouTube channel or Twitch user, served from
 * `/images/profile-images/[id]`.
 */
export type ProfileImage = Pick<
  Tables<"profile_images">,
  "blur_data_url" | "id"
>;

/**
 * 活動中のタレント（ID と名前）を名前の昇順で取得する。動画一覧のタレントの
 * 絞り込みの選択肢に使う。
 */
export const fetchActiveTalents = async (): Promise<Talent[]> => {
  "use cache: remote";

  cacheLife("hours");
  cacheTag(CACHE_TAGS.TALENTS);

  return unwrap(
    await supabaseClient
      .from("talents")
      .select("id, name")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("name", {
        ascending: true,
      }),
    "fetchActiveTalents"
  );
};

export interface TalentYouTubeChannel extends Pick<
  Tables<"youtube_channels">,
  "name" | "youtube_channel_id" | "youtube_handle"
> {
  profile_image: ProfileImage | null;
}

export interface TalentTwitchUser extends Pick<
  Tables<"twitch_users">,
  "name" | "twitch_login_name" | "twitch_user_id"
> {
  profile_image: ProfileImage | null;
}

/**
 * A talent with the YouTube channels and Twitch users it has, and its theme
 * color (not validated, as it is entered by hand).
 *
 * The channels and users are sorted by their platform IDs, so a talent with
 * several of them always shows the same icon and links in the same order.
 */
export interface TalentDetail
  extends Talent, Pick<Tables<"talents">, "theme_color"> {
  twitch_users: TalentTwitchUser[];
  youtube_channels: TalentYouTubeChannel[];
}

const TALENT_DETAIL_SELECT = `
  id,
  name,
  theme_color,
  youtube_channels (
    name,
    youtube_channel_id,
    youtube_handle,
    profile_image:profile_images (blur_data_url, id)
  ),
  twitch_users (
    name,
    twitch_login_name,
    twitch_user_id,
    profile_image:profile_images (blur_data_url, id)
  )
`;

const compareStrings = (a: string, b: string): number => {
  if (a === b) {
    return 0;
  }

  return a < b ? -1 : 1;
};

/**
 * Fetch an active talent (`status = 'active'` and not deleted).
 *
 * Returns `null` for IDs that are not UUIDs and for talents that do not
 * exist, are retired, or are deleted.
 */
export const fetchTalent = async (id: string): Promise<TalentDetail | null> => {
  "use cache: remote";

  cacheLife("days");
  cacheTag(CACHE_TAGS.TALENTS);

  if (!isUUID(id)) {
    return null;
  }

  const talent = unwrap(
    await supabaseClient
      .from("talents")
      .select(TALENT_DETAIL_SELECT)
      .eq("id", id)
      .eq("status", "active")
      .is("deleted_at", null)
      .maybeSingle(),
    "fetchTalent"
  );

  if (!talent) {
    return null;
  }

  return {
    ...talent,
    twitch_users: talent.twitch_users.toSorted((a, b) =>
      compareStrings(a.twitch_user_id, b.twitch_user_id)
    ),
    youtube_channels: talent.youtube_channels.toSorted((a, b) =>
      compareStrings(a.youtube_channel_id, b.youtube_channel_id)
    ),
  };
};

/** The icon of a YouTube channel or Twitch user of a talent */
export interface TalentAccountIcon {
  profile_image: ProfileImage | null;
}

/**
 * A talent in the list of talents: the ID, the name, and the icons of its
 * YouTube channels and Twitch users to pick the icon from.
 *
 * The accounts are in the same order as `fetchTalent` returns them, so a
 * talent shows the same icon in the list and on its page.
 */
export interface TalentListItem extends Talent {
  twitch_users: TalentAccountIcon[];
  youtube_channels: TalentAccountIcon[];
}

// The platform IDs are fetched only to sort the accounts like `fetchTalent`
const TALENT_LIST_SELECT = `
  id,
  name,
  youtube_channels (
    youtube_channel_id,
    profile_image:profile_images (blur_data_url, id)
  ),
  twitch_users (
    twitch_user_id,
    profile_image:profile_images (blur_data_url, id)
  )
`;

/**
 * Fetch the active talents (`status = 'active'` and not deleted) for the list
 * of talents, sorted by reading in the order of the Japanese syllabary (the
 * column uses the `ja-x-icu` collation). Talents without a reading come last,
 * sorted by name.
 */
export const fetchTalentList = async (): Promise<TalentListItem[]> => {
  "use cache: remote";

  cacheLife("days");
  cacheTag(CACHE_TAGS.TALENTS);

  const talents = unwrap(
    await supabaseClient
      .from("talents")
      .select(TALENT_LIST_SELECT)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("reading", {
        ascending: true,
        nullsFirst: false,
      })
      .order("name", {
        ascending: true,
      }),
    "fetchTalentList"
  );

  return talents.map((talent) => ({
    id: talent.id,
    name: talent.name,
    twitch_users: talent.twitch_users
      .toSorted((a, b) => compareStrings(a.twitch_user_id, b.twitch_user_id))
      .map(({ profile_image }) => ({ profile_image })),
    youtube_channels: talent.youtube_channels
      .toSorted((a, b) =>
        compareStrings(a.youtube_channel_id, b.youtube_channel_id)
      )
      .map(({ profile_image }) => ({ profile_image })),
  }));
};

/** Whether a talent is streaming now, and when it streams next */
export interface TalentStreamStatus {
  /** Whether the talent has a video that is streaming now */
  isLive: boolean;
  /**
   * The start (ISO 8601) of the earliest stream from the start of this hour to
   * a week later, the same end as the upcoming videos on the home page. `null`
   * while the talent is live.
   */
  nextStreamAt: string | null;
}

// The platform videos are fetched only to skip the videos the site does not
// show, as `hasPlatformSource` does
const TALENT_STREAM_SELECT = `
  published_at,
  status,
  talent_id,
  twitch_video:twitch_videos (twitch_video_id),
  youtube_video:youtube_videos (youtube_video_id)
`;

/**
 * Fetch whether each talent is streaming now and when it streams next, keyed
 * by the ID of the talent. Talents with neither are not included.
 *
 * It is cached apart from `fetchTalentList`, as it changes much more often.
 */
export const fetchTalentStreamStatuses = async (): Promise<
  Record<string, TalentStreamStatus>
> => {
  "use cache: remote";

  cacheLife("minutes");
  cacheTag(CACHE_TAGS.VIDEOS);

  const baseTime = startOfHour(Temporal.Now.zonedDateTimeISO(TIME_ZONE));
  const until = baseTime.add({
    weeks: 1,
  });

  const videos = unwrap(
    await supabaseClient
      .from("videos")
      .select(TALENT_STREAM_SELECT)
      .in("status", ["LIVE", "UPCOMING"])
      .lte("published_at", toDBString(until))
      .order("published_at", {
        ascending: true,
      }),
    "fetchTalentStreamStatuses"
  );

  // An upcoming stream that should have started before this hour is not the
  // next one any more, while one that is a little late still is
  const since = baseTime.toInstant();
  const statuses: Record<string, TalentStreamStatus> = {};

  for (const video of videos) {
    if (video.youtube_video == null && video.twitch_video == null) {
      continue;
    }

    if (
      video.status === "UPCOMING" &&
      Temporal.Instant.compare(
        Temporal.Instant.from(video.published_at),
        since
      ) < 0
    ) {
      continue;
    }

    const status = statuses[video.talent_id] ?? {
      isLive: false,
      nextStreamAt: null,
    };

    statuses[video.talent_id] = status;

    if (video.status === "LIVE") {
      status.isLive = true;
      status.nextStreamAt = null;
    } else if (!status.isLive && status.nextStreamAt === null) {
      // The videos are sorted by the start, so the first one is the earliest
      status.nextStreamAt = video.published_at;
    }
  }

  return statuses;
};

/**
 * `fetchTalentStreamStatuses`, or no statuses when they cannot be fetched, as
 * the talents are still shown without them. The error is logged.
 */
export const fetchTalentStreamStatusesSafe = async (): Promise<
  Record<string, TalentStreamStatus>
> => {
  try {
    return await fetchTalentStreamStatuses();
  } catch (error) {
    logger.error("Failed to fetch the stream statuses of the talents", {
      error,
    });

    return {};
  }
};

/**
 * Fetch the starts (ISO 8601) of the streams a talent has finished, for the
 * tendency of its streams on its page: the regular videos (not shorts) that
 * are `ENDED`, which are the finished streams and premieres, from
 * `STREAM_TENDENCY_DAYS` days before the start of today in `TIME_ZONE` to the
 * start of today.
 *
 * Today is left out, so the result stays the same for the day it is cached.
 */
export const fetchTalentStreamStarts = async (
  talentId: string
): Promise<string[]> => {
  "use cache: remote";

  cacheLife("days");
  cacheTag(CACHE_TAGS.VIDEOS);

  const until = Temporal.Now.zonedDateTimeISO(TIME_ZONE).startOfDay();
  const since = until.subtract({ days: STREAM_TENDENCY_DAYS });

  const videos = unwrap(
    await supabaseClient
      .from("videos")
      .select("published_at")
      .eq("talent_id", talentId)
      .eq("status", "ENDED")
      .eq("video_kind", "standard")
      .gte("published_at", toDBString(since))
      .lt("published_at", toDBString(until))
      .order("published_at", {
        ascending: false,
      })
      .limit(1000),
    "fetchTalentStreamStarts"
  );

  return videos.map((video) => video.published_at);
};
