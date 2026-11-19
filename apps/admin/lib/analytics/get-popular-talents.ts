import { REDIS_KEYS } from "@shinju-date/constants";
import { logger } from "@shinju-date/logger";
import type { QueryData } from "@supabase/supabase-js";
import { cacheLife } from "next/cache";

import { isNonNullable } from "@/lib/is-non-nullable";
import { createSupabaseServerClient } from "@/lib/supabase";
import type { TypedSupabaseClient } from "@/lib/supabase";

import { DEFAULT_RANKING_LIMIT, toDateRange } from "./period";
import type { RankingQuery } from "./period";
import { getPopularItems } from "./popular-items";

const POPULAR_TALENT_SELECT = `
  id,
  name,
  youtube_channels (youtube_channel_id)
`;

const selectPopularTalents = (
  supabaseClient: TypedSupabaseClient,
  talentIds: string[]
) =>
  supabaseClient
    .from("talents")
    .select(POPULAR_TALENT_SELECT)
    .in("id", talentIds);

type PopularTalentRow = QueryData<
  ReturnType<typeof selectPopularTalents>
>[number];

export interface PopularTalent extends PopularTalentRow {
  clicks: number;
}

/**
 * Get popular talents based on click data for a date range
 * @param query.range - The date range (both ends inclusive). Pass the same date as `start` and `end` for a single date
 * @param query.limit - Maximum number to return (`DEFAULT_RANKING_LIMIT` by default)
 */
export const getPopularTalents = async ({
  limit = DEFAULT_RANKING_LIMIT,
  range,
}: RankingQuery): Promise<PopularTalent[]> => {
  "use cache: private";

  cacheLife("minutes");

  const talentScores = await getPopularItems(REDIS_KEYS.CLICK_CHANNEL_PREFIX, {
    limit,
    range: toDateRange(range),
  });

  if (talentScores.length === 0) {
    return [];
  }

  const supabaseClient = await createSupabaseServerClient();

  const talentIds = talentScores.map(([id]) => id);
  const { data: talents, error } = await selectPopularTalents(
    supabaseClient,
    talentIds
  );

  if (error) {
    logger.error("タレントの詳細取得に失敗しました", {
      error,
      talentIds: talentIds.join(","),
    });

    return [];
  }

  const talentMap = new Map(talents.map((c) => [c.id, c]));

  return talentScores
    .map(([id, clicks]) => {
      const talent = talentMap.get(id);
      if (!talent) {
        return null;
      }

      return { ...talent, clicks };
    })
    .filter(isNonNullable);
};
