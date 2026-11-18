/**
 * Redis mock data factory using @faker-js/faker
 * Generates realistic Redis data structures for testing
 */
import { faker } from "@faker-js/faker";
import { REDIS_KEYS, TIME_ZONE } from "@shinju-date/constants";
import { formatDateKey } from "@shinju-date/temporal-fns";

export interface SortedSetItem {
  member: string;
  score: number;
}

/**
 * A video that can be clicked on the public site
 */
export interface ClickableVideo {
  id: string;
  talent_id: string;
}

export interface RedisDataFactoryOptions {
  /**
   * The last day to generate data for. Defaults to today in `TIME_ZONE`,
   * which the apps also use for the date keys.
   */
  today?: Temporal.PlainDate;
  /**
   * The videos whose IDs are used as the members of the click data. Pass the
   * videos of the Supabase mock so that the apps can look them up.
   */
  videos: readonly ClickableVideo[];
}

const SEARCH_KEYWORDS = [
  "歌枠",
  "ゲーム配信",
  "ASMR",
  "コラボ",
  "Minecraft",
  "APEX",
  "雑談",
];

/**
 * Create Redis mock data with realistic values
 * Generates click tracking and search keyword data for N days
 *
 * The clicks of a talent are the sum of the clicks of their videos, like
 * `apps/web` records them.
 *
 * @param dateCount Number of days to generate data for, including today
 * @param options The videos to use and the last day
 * @returns Map of Redis keys to their values
 */
export const createRedisDataFactory = (
  dateCount: number,
  {
    today = Temporal.Now.plainDateISO(TIME_ZONE),
    videos,
  }: RedisDataFactoryOptions
): Map<string, SortedSetItem[] | Set<string>> => {
  const store = new Map<string, SortedSetItem[] | Set<string>>();

  for (let i = 0; i < dateCount; i++) {
    const dateKey = formatDateKey(today.subtract({ days: i }));

    // Videos clicked data (sorted set with scores)
    const clickedVideos = faker.helpers.arrayElements(videos, {
      max: Math.min(15, videos.length),
      min: Math.min(5, videos.length),
    });
    const videosClicked: SortedSetItem[] = [];
    const talentClicks = new Map<string, number>();

    for (const video of clickedVideos) {
      const score = faker.number.int({ max: 100, min: 1 });

      videosClicked.push({ member: video.id, score });
      talentClicks.set(
        video.talent_id,
        (talentClicks.get(video.talent_id) ?? 0) + score
      );
    }

    if (videosClicked.length > 0) {
      store.set(`${REDIS_KEYS.CLICK_VIDEO_PREFIX}${dateKey}`, videosClicked);
      store.set(
        `${REDIS_KEYS.CLICK_CHANNEL_PREFIX}${dateKey}`,
        Array.from(talentClicks, ([member, score]) => ({ member, score }))
      );
    }

    // Search keywords data (set of strings)
    const searchKeywords = new Set<string>();
    for (let j = 0; j < faker.number.int({ max: 10, min: 3 }); j++) {
      searchKeywords.add(faker.helpers.arrayElement(SEARCH_KEYWORDS));
    }
    store.set(`search:keywords:${dateKey}`, searchKeywords);
  }

  return store;
};
