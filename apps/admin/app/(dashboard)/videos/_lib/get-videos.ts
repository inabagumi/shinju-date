import { REDIS_KEYS, TIME_ZONE } from "@shinju-date/constants";
import type { Tables } from "@shinju-date/database";
import { range } from "@shinju-date/helpers";
import { logger } from "@shinju-date/logger";
import { formatDateKey } from "@shinju-date/temporal-fns";
import type { QueryData } from "@supabase/supabase-js";
import { cacheLife } from "next/cache";

import { getRedisClient } from "@/lib/redis";
import { createSupabaseServerClient } from "@/lib/supabase";
import type { TypedSupabaseClient } from "@/lib/supabase";
import { unwrap } from "@/lib/supabase/query";

import { escapeSearchString } from "./escape-search";
import { VIDEO_SELECT } from "./video-select";

const selectVideos = (supabaseClient: TypedSupabaseClient) =>
  supabaseClient.from("videos").select(VIDEO_SELECT, { count: "exact" });

type VideoRow = QueryData<ReturnType<typeof selectVideos>>[number];

export interface Video extends Omit<VideoRow, "talent"> {
  clicks: number;
  // Embedded relations may be missing (e.g. hidden by RLS or absent in mock
  // data), so consumers must handle `null`.
  talent: VideoRow["talent"] | null;
}

export interface VideoFilters {
  talentId?: string[] | undefined;
  deleted?: boolean[] | undefined;
  visible?: boolean[] | undefined;
  search?: string | undefined;
  status?: Tables<"videos">["status"][] | undefined;
  platform?: Tables<"videos">["platform"][] | undefined;
  videoKind?: Tables<"videos">["video_kind"][] | undefined;
}

export type VideoSortField = "published_at" | "updated_at";
export type VideoSortOrder = "asc" | "desc";

type VideoQuery = ReturnType<typeof selectVideos>;

const hasValues = <T>(values: T[] | undefined): values is T[] =>
  values !== undefined && values.length > 0;

const applyVideoFilters = (
  initialQuery: VideoQuery,
  filters: VideoFilters | undefined
): VideoQuery => {
  let query = initialQuery;

  if (hasValues(filters?.talentId)) {
    query = query.in("talent_id", filters.talentId);
  }
  if (hasValues(filters?.visible)) {
    query = query.in("visible", filters.visible);
  }
  if (hasValues(filters?.status)) {
    query = query.in("status", filters.status);
  }
  if (hasValues(filters?.platform)) {
    query = query.in("platform", filters.platform);
  }
  if (hasValues(filters?.videoKind)) {
    query = query.in("video_kind", filters.videoKind);
  }
  // Handle text search
  if (filters?.search) {
    const escapedSearch = escapeSearchString(filters.search);
    query = query.ilike("title", `%${escapedSearch}%`);
  }
  // Handle deleted filter with OR logic. Only when one value is selected;
  // if both true and false are selected, don't apply any filter (show all)
  if (filters?.deleted?.length === 1) {
    query =
      filters.deleted[0] === true
        ? query.not("deleted_at", "is", null)
        : query.is("deleted_at", null);
  }

  return query;
};

/**
 * Sum up the clicks of the given days for each video. A video whose counts
 * cannot be fetched gets 0
 */
const getClickCounts = async (
  videoIds: string[],
  days: string[]
): Promise<number[]> => {
  const redisClient = getRedisClient();

  // Use Promise.allSettled to handle individual video click count failures gracefully
  const clickCountResults = await Promise.allSettled(
    videoIds.map(async (id) => {
      // Sum up clicks from all 7 days
      const scores = await Promise.all(
        days.map((day) =>
          redisClient.zscore(`${REDIS_KEYS.CLICK_VIDEO_PREFIX}${day}`, id)
        )
      );
      return scores.reduce<number>(
        (sum, score) => sum + (typeof score === "number" ? score : 0),
        0
      );
    })
  );

  // Extract click counts from results, using 0 for any failures
  return clickCountResults.map((clickCountResult, index) => {
    if (clickCountResult.status === "fulfilled") {
      return clickCountResult.value;
    }
    // Log error for rejected promise
    logger.error("動画のクリック数の取得に失敗しました", {
      error: clickCountResult.reason,
      videoId: videoIds[index],
    });
    return 0;
  });
};

export const getVideos = async (
  page = 1,
  perPage = 20,
  filters?: VideoFilters,
  sortField: VideoSortField = "updated_at",
  sortOrder: VideoSortOrder = "desc"
): Promise<{
  videos: Video[];
  total: number;
}> => {
  "use cache: private";

  cacheLife("minutes");

  const supabaseClient = await createSupabaseServerClient();

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  // Apply filters
  const query = applyVideoFilters(selectVideos(supabaseClient), filters);

  // Fetch videos from Supabase with pagination
  const result = await query
    .order(sortField, { ascending: sortOrder === "asc" })
    .range(from, to);
  const videos = unwrap(result, "getVideos") ?? [];
  const { count } = result;

  // Get last 7 days in JST timezone
  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE);
  const days = range(7).map((i) => {
    const date = today.subtract({ days: i });
    return formatDateKey(date);
  });

  // Fetch click counts for all videos for the last 7 days
  // Using video.id as the Redis key (matches the write side in increment.ts)
  const videoIds = videos.map((video) => video.id);

  const clickCounts = await getClickCounts(videoIds, days);

  // Combine video data with click counts
  const videosWithClicks: Video[] = videos.map((video, index) => ({
    ...video,
    clicks: clickCounts[index] ?? 0,
  }));

  return {
    total: count ?? 0,
    videos: videosWithClicks,
  };
};
