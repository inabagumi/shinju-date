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

  for (let i = 0; i < dateCount; i += 1) {
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
    for (let j = 0; j < faker.number.int({ max: 10, min: 3 }); j += 1) {
      searchKeywords.add(faker.helpers.arrayElement(SEARCH_KEYWORDS));
    }
    store.set(`search:keywords:${dateKey}`, searchKeywords);
  }

  return store;
};

/**
 * The counts of the dashboard as of the end of a day, in the form that
 * `writeSummarySnapshot` of `@shinju-date/dashboard-stats` saves
 * (`SummaryStats`).
 */
export interface SummarySnapshot {
  deletedVideos: number;
  hiddenVideos: number;
  scheduledVideos: number;
  totalTalents: number;
  totalTerms: number;
  totalVideos: number;
  visibleVideos: number;
}

export interface SummarySnapshotsOptions {
  /** The current day. Defaults to today in `TIME_ZONE`. */
  today?: Temporal.PlainDate;
}

/**
 * The net changes of the videos on each of the 7 days up to yesterday, from
 * the oldest, so that the chart of the dashboard has an increase, a decrease
 * and no change.
 */
const SUMMARY_SNAPSHOT_CHANGES = [4, -2, 0, 3, 5, 1, 2] as const;

/**
 * The day without a snapshot, as if the daily job failed (days before
 * yesterday). The chart shows it and the day after as missing.
 */
const MISSING_SNAPSHOT_DAYS_BEFORE_YESTERDAY = 3;

/**
 * Create the snapshots of the counts that the daily job `/stats/snapshot` of
 * batch saves, for the 8 days up to yesterday (7 changes and the day before
 * them). One of the days has no snapshot.
 *
 * The snapshot of yesterday has the current counts, and each day before it
 * has fewer (or more) public videos by the change of the next day.
 *
 * @param current The current counts of the mock data
 * @returns Map of Redis keys to the snapshots
 */
export const createSummarySnapshots = (
  current: SummarySnapshot,
  { today = Temporal.Now.plainDateISO(TIME_ZONE) }: SummarySnapshotsOptions = {}
): Map<string, SummarySnapshot> => {
  const store = new Map<string, SummarySnapshot>();
  const yesterday = today.subtract({ days: 1 });
  // The sum of the changes of the days after the day, up to yesterday
  let laterChanges = 0;

  for (
    let daysAgo = 0;
    daysAgo <= SUMMARY_SNAPSHOT_CHANGES.length;
    daysAgo += 1
  ) {
    if (daysAgo !== MISSING_SNAPSHOT_DAYS_BEFORE_YESTERDAY) {
      const dateKey = formatDateKey(yesterday.subtract({ days: daysAgo }));

      store.set(`${REDIS_KEYS.SUMMARY_STATS_PREFIX}${dateKey}`, {
        ...current,
        totalVideos: current.totalVideos - laterChanges,
        visibleVideos: current.visibleVideos - laterChanges,
      });
    }

    laterChanges +=
      SUMMARY_SNAPSHOT_CHANGES[SUMMARY_SNAPSHOT_CHANGES.length - 1 - daysAgo] ??
      0;
  }

  return store;
};
