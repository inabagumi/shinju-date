import { REDIS_KEYS } from "@shinju-date/constants";
import { logger } from "@shinju-date/logger";
import { throwIfError } from "@shinju-date/scraper";
import type { Redis } from "@upstash/redis";

import type { TypedSupabaseClient } from "@/lib/supabase";

interface TermPopularity {
  term: string;
  score: number;
}

/**
 * Fetch search popularity data from Redis
 * Uses the all-time search popularity sorted set
 */
const fetchSearchPopularityFromRedis = async (
  redis: Redis
): Promise<TermPopularity[]> => {
  try {
    // Fetch all terms from the all-time popularity sorted set
    // withScores: true returns a flat array [member1, score1, member2, score2, ...]
    const results = await redis.zrange<(string | number)[]>(
      REDIS_KEYS.SEARCH_POPULAR_ALL_TIME,
      0,
      -1,
      {
        withScores: true,
      }
    );

    if (!results || results.length === 0) {
      logger.info("Redisに検索人気度データが見つかりませんでした");
      return [];
    }

    // Convert flat array to array of objects with term and score
    const popularityData: TermPopularity[] = [];
    for (let i = 0; i < results.length; i += 2) {
      const term = results[i];
      const score = results[i + 1];

      if (typeof term === "string" && typeof score === "number") {
        popularityData.push({
          // Ensure integer
          score: Math.floor(score),
          term,
        });
      }
    }

    logger.info("Redisから検索人気度データを取得しました", {
      count: popularityData.length,
    });

    return popularityData;
  } catch (error) {
    logger.error("Redisからの検索人気度データの取得に失敗しました", { error });
    throw error;
  }
};

/**
 * How many terms one call of `update_terms_popularity` updates. Keeps each
 * request and UPDATE statement small, whatever the number of terms.
 */
export const UPDATE_BATCH_SIZE = 500;

/**
 * Update the popularity of the terms in the database
 *
 * Only `popularity` is written, so edits made in the admin app while the batch
 * runs are kept. Terms are matched ignoring the case by the
 * `update_terms_popularity` function, in batches of `UPDATE_BATCH_SIZE`, so
 * there is no limit on the number of terms.
 */
const updateTermsPopularityInDatabase = async (
  supabase: TypedSupabaseClient,
  popularityData: TermPopularity[]
): Promise<{ updated: number; notFound: number }> => {
  let updated = 0;

  for (let i = 0; i < popularityData.length; i += UPDATE_BATCH_SIZE) {
    const items = popularityData
      .slice(i, i + UPDATE_BATCH_SIZE)
      .map(({ score, term }) => ({ score, term }));

    updated += throwIfError(
      // oxlint-disable-next-line eslint/no-await-in-loop -- the batches are sent one at a time to keep the load on the database small
      await supabase.rpc("update_terms_popularity", { p_items: items }),
      "Failed to update the popularity of terms"
    );
  }

  // Search queries are saved in lowercase, so each of them matches one term,
  // unless terms differ only in case.
  const notFound = Math.max(popularityData.length - updated, 0);

  if (updated === 0) {
    logger.info("更新対象の用語が見つかりませんでした");
  }

  return { notFound, updated };
};

/**
 * Main function to update term popularity from Redis to database
 */
export const updateTermPopularity = async (
  redis: Redis,
  supabase: TypedSupabaseClient
): Promise<{ updated: number; notFound: number; total: number }> => {
  // Fetch popularity data from Redis
  const popularityData = await fetchSearchPopularityFromRedis(redis);

  if (popularityData.length === 0) {
    return { notFound: 0, total: 0, updated: 0 };
  }

  // Update database
  const result = await updateTermsPopularityInDatabase(
    supabase,
    popularityData
  );

  logger.info("用語の人気度更新が完了しました", {
    notFound: result.notFound,
    total: popularityData.length,
    updated: result.updated,
  });

  return {
    ...result,
    total: popularityData.length,
  };
};
