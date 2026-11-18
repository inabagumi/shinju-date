import { CACHE_TAGS, REDIS_KEYS, TIME_ZONE } from "@shinju-date/constants";
import { logger } from "@shinju-date/logger";
import { formatDateKey, getMondayOfWeek } from "@shinju-date/temporal-fns";
import { revalidateTags } from "@shinju-date/web-cache";
import type { NextRequest } from "next/server";

import { runCronJob } from "@/lib/cron";
import { RECOMMENDATION_QUERIES_UPDATE_JOB } from "@/lib/jobs";
import { redisClient } from "@/lib/redis";
import { supabaseClient } from "@/lib/supabase";

import { getAllTerms } from "./_lib/get-all-terms";

// Weights for different time periods
const WEIGHT_DAILY = 10.0;
const WEIGHT_WEEKLY = 5.0;
const WEIGHT_ALL_TIME = 1.0;

/**
 * How long the working key of the weighted union is kept, in case the job
 * stops before it deletes the key.
 */
const TEMP_UNION_TTL_SECONDS = 10 * 60;

/**
 * How long the automatic recommendations are kept. The job rebuilds them every
 * day; when it has stopped for a week, the stale ones are not shown.
 */
const AUTO_RECOMMENDED_TTL_SECONDS = 8 * 24 * 60 * 60;

interface WeightedQuery {
  query: string;
  score: number;
}

/**
 * Sums the scores of the rankings with their weights, using a working key
 * that is deleted afterwards even when reading it fails.
 */
async function readWeightedQueries(
  keys: string[],
  weights: number[]
): Promise<WeightedQuery[]> {
  try {
    await redisClient.zunionstore(
      REDIS_KEYS.SEARCH_POPULAR_TEMP_UNION,
      keys.length,
      [...keys, "WEIGHTS", ...weights.map(String)]
    );
    await redisClient.expire(
      REDIS_KEYS.SEARCH_POPULAR_TEMP_UNION,
      TEMP_UNION_TTL_SECONDS
    );

    // Format: [member, score, member, score, ...]
    const weightedQueries = await redisClient.zrange(
      REDIS_KEYS.SEARCH_POPULAR_TEMP_UNION,
      0,
      -1,
      {
        withScores: true,
      }
    );

    const queriesWithScores: WeightedQuery[] = [];
    for (let i = 0; i < weightedQueries.length; i += 2) {
      const query = String(weightedQueries[i]);
      const score = Number(weightedQueries[i + 1]);
      queriesWithScores.push({ query, score });
    }

    return queriesWithScores;
  } finally {
    // The key expires anyway, so a failure here must not hide the result or
    // the original error.
    await redisClient
      .del(REDIS_KEYS.SEARCH_POPULAR_TEMP_UNION)
      .catch((error: unknown) => {
        logger.warn("検索語の集計の作業用のキーを削除できませんでした", {
          error,
        });
      });
  }
}

export const maxDuration = 120;

export async function POST(request: NextRequest): Promise<Response> {
  return runCronJob(request, RECOMMENDATION_QUERIES_UPDATE_JOB, async () => {
    const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE);
    const today = formatDateKey(now);
    const mondayOfWeek = getMondayOfWeek(now);

    const dailyKey = `${REDIS_KEYS.SEARCH_POPULAR_DAILY_PREFIX}${today}`;
    const weeklyKey = `${REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX}${mondayOfWeek}`;
    const allTimeKey = REDIS_KEYS.SEARCH_POPULAR_ALL_TIME;

    // Get all keys to check if they exist
    const [dailyExists, weeklyExists, allTimeExists] = await Promise.all([
      redisClient.exists(dailyKey),
      redisClient.exists(weeklyKey),
      redisClient.exists(allTimeKey),
    ]);

    // Build the list of keys and weights for ZUNIONSTORE
    const keysToUnion: string[] = [];
    const weights: number[] = [];

    if (dailyExists) {
      keysToUnion.push(dailyKey);
      weights.push(WEIGHT_DAILY);
    }
    if (weeklyExists) {
      keysToUnion.push(weeklyKey);
      weights.push(WEIGHT_WEEKLY);
    }
    if (allTimeExists) {
      keysToUnion.push(allTimeKey);
      weights.push(WEIGHT_ALL_TIME);
    }

    if (keysToUnion.length === 0) {
      logger.info("検索のデータがないため、おすすめの検索語を空にしました");

      // Clear the auto_recommended key if no data available
      await redisClient.del(REDIS_KEYS.QUERIES_AUTO_RECOMMENDED);

      await revalidateTags([CACHE_TAGS.RECOMMENDATION_QUERIES], {
        signal: request.signal,
      });

      return;
    }

    const queriesWithScores = await readWeightedQueries(keysToUnion, weights);

    // Build a map from all terms/synonyms (lowercase) to their canonical term
    const termMap = new Map<string, string>();
    for await (const { term, synonyms } of getAllTerms(supabaseClient)) {
      const lowerTerm = term.toLowerCase();
      // Map the term to itself
      termMap.set(lowerTerm, term);
      // Map all synonyms to the main term
      for (const synonym of synonyms) {
        termMap.set(synonym.toLowerCase(), term);
      }
    }

    // Filter queries that match terms or synonyms, and map to canonical term
    const matchingQueriesMap = new Map<string, number>();
    for (const { query, score } of queriesWithScores) {
      const canonicalTerm = termMap.get(query.toLowerCase());
      if (canonicalTerm) {
        // If this canonical term is already in the map, use the higher score
        const existingScore = matchingQueriesMap.get(canonicalTerm) ?? 0;
        if (score > existingScore) {
          matchingQueriesMap.set(canonicalTerm, score);
        }
      }
    }

    // Convert map to array and sort by score descending
    const matchingQueries = Array.from(matchingQueriesMap.entries()).map(
      ([query, score]) => ({ query, score })
    );
    matchingQueries.sort((a, b) => b.score - a.score);

    // Delete old auto_recommended ZSET and create new one
    const multi = redisClient.multi();
    multi.del(REDIS_KEYS.QUERIES_AUTO_RECOMMENDED);

    if (matchingQueries.length > 0) {
      // Add all matching queries with their scores
      for (const { query, score } of matchingQueries) {
        multi.zadd(REDIS_KEYS.QUERIES_AUTO_RECOMMENDED, {
          member: query,
          score,
        });
      }
      multi.expire(
        REDIS_KEYS.QUERIES_AUTO_RECOMMENDED,
        AUTO_RECOMMENDED_TTL_SECONDS
      );
    }

    await multi.exec();

    await revalidateTags([CACHE_TAGS.RECOMMENDATION_QUERIES], {
      signal: request.signal,
    });

    logger.info("おすすめの検索語を更新しました", {
      count: matchingQueries.length,
      topQueries: matchingQueries.slice(0, 10).map(({ query, score }) => ({
        query,
        score,
      })),
    });
  });
}

export const GET = POST;
