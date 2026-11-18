import { shuffle } from "../shuffle";
import { TOTAL_DISPLAY_COUNT } from "./constants";
import { getCombinedRecommendationQueries } from "./get-combined-queries";

// Top 1-2 queries always shown
const CHAMPION_COUNT = 2;
// Start index for random pool (0-based, so 3rd position)
const RANDOM_POOL_START = 2;
// End index for random pool (up to 20th position)
const RANDOM_POOL_END = 20;

/**
 * Get recommendation queries for display with diversity
 *
 * Combines "champion" queries (top 1-2 by score) with randomly selected
 * queries from a pool of semi-popular queries (ranks 3-20).
 *
 * This approach ensures:
 * - Important queries always get exposure
 * - Users see variety on each page load
 * - Semi-popular queries get occasional visibility
 *
 * Only `getCombinedRecommendationQueries` is cached. The selection here runs
 * outside the cache, so the random part changes on every call.
 *
 * @returns Array of query strings to display (max `TOTAL_DISPLAY_COUNT`)
 */
export const getDisplayRecommendationQueries = async (): Promise<string[]> => {
  const allQueries = await getCombinedRecommendationQueries();

  // If we have few enough queries, just return them all
  if (allQueries.length <= TOTAL_DISPLAY_COUNT) {
    return allQueries;
  }

  // Get champion queries (top 1-2)
  const championQueries = allQueries.slice(0, CHAMPION_COUNT);

  // Get random pool (queries from rank 3 to 20)
  const randomPool = allQueries.slice(RANDOM_POOL_START, RANDOM_POOL_END);

  // Shuffle random pool and take the needed number
  const randomCount = TOTAL_DISPLAY_COUNT - championQueries.length;
  const randomQueries = shuffle(randomPool).slice(0, randomCount);

  return [...championQueries, ...randomQueries];
};
