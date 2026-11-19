import { TIME_ZONE } from "@shinju-date/constants";
import { createErrorResponse } from "@shinju-date/helpers";
import { logger } from "@shinju-date/logger";
import { startOfHour } from "@shinju-date/temporal-fns";

import { fetchCalendarVideos } from "@/lib/data/videos";
import type { CalendarVideo } from "@/lib/data/videos";

import { createCalendarResponse, createEventAttributesList } from "./calendar";
import { normalizeTalentIds } from "./talent-filter";
import type { VideoKindFilter } from "./video-kind-filter";

interface CreateVideosCalendarResponseOptions {
  /** 動画の種別。`all` では絞り込まない */
  kind?: VideoKindFilter | undefined;
  /** タレントの ID。空のときは絞り込まない */
  talentIds?: readonly string[] | undefined;
}

/**
 * 1週間先までの動画を新しい順に 100 件まで取得し、カレンダーとして返す。
 * `/videos.ics` とタレント別のカレンダーで共有する。
 */
export const createVideosCalendarResponse = async ({
  kind = "all",
  talentIds = [],
}: CreateVideosCalendarResponseOptions = {}): Promise<Response> => {
  let videos: CalendarVideo[];

  try {
    videos = await fetchCalendarVideos({
      kind,
      // Share one cache entry between the same talents in any order
      talentIds: normalizeTalentIds(talentIds),
    });
  } catch (error) {
    logger.error("カレンダーの動画の取得に失敗しました", {
      error,
      kind,
      talentIds,
    });

    return createErrorResponse("Internal Server Error", {
      status: 500,
    });
  }

  const events = createEventAttributesList(videos, {
    now: startOfHour(Temporal.Now.zonedDateTimeISO(TIME_ZONE)),
  });

  return createCalendarResponse(events);
};
