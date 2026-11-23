import { TIME_ZONE } from "@shinju-date/constants";
import type { Tables } from "@shinju-date/database";
import { toDBString } from "@shinju-date/temporal-fns";

import type { SeedContext } from "./context.js";
import { createVideo } from "./videos.js";

/**
 * When the seeded stream on the schedule that is on air now starts: 30
 * minutes before `now`, but within the day of `now`, so that the hour the
 * schedule draws it for (from its start) does not cross the end of the day.
 * It is never later than `now`, and is in the current week even right after
 * the week starts on Sunday.
 */
export const getLiveScheduleStart = (
  now: Temporal.ZonedDateTime
): Temporal.ZonedDateTime => {
  const dayStart = now.startOfDay();
  // The latest start whose hour ends by the end of the day
  const latestStart = dayStart.add({ days: 1 }).subtract({ hours: 1 });
  const start = now.subtract({ minutes: 30 });

  if (Temporal.ZonedDateTime.compare(start, dayStart) < 0) {
    return dayStart;
  }

  if (Temporal.ZonedDateTime.compare(start, latestStart) > 0) {
    return latestStart;
  }

  return start;
};

const SCHEDULE_TITLES = [
  "【定期】朝の雑談",
  "【歌枠】リクエスト歌枠",
  "【ゲーム】RPG 実況",
  "【雑談】週末のふりかえり",
] as const;

interface ScheduleDependencies {
  /** The talents that the streams belong to in turn */
  talents: readonly Tables<"talents">[];
  thumbnails: readonly Tables<"thumbnails">[];
}

/**
 * Streams for the schedule of the public site: 2 on each day of the current
 * week (from Sunday to Saturday in Japan), 1 in each of the previous and the
 * next weeks, 2 from 23:30 that cross 00:00 (on Thursday, and on Saturday into
 * the Sunday of the next week), and 1 on air now (`getLiveScheduleStart`, so
 * that the hour it is drawn for stays within today). Their status follows the
 * start: `ENDED` before `now` and `UPCOMING` after it.
 */
export const createScheduleVideos = (
  context: SeedContext,
  { talents, thumbnails }: ScheduleDependencies
): Tables<"videos">[] => {
  const now = context.now.toZonedDateTimeISO(TIME_ZONE);
  const weekStart = now
    .toPlainDate()
    .subtract({ days: now.dayOfWeek % 7 })
    .toZonedDateTime(TIME_ZONE);
  // Some streams of different days start in the same hour, so the rows of the
  // hours on the schedule can be checked
  const starts = [
    ...Array.from({ length: 7 }, (_, day) => [
      weekStart.add({ days: day, hours: 12 + (day % 3) * 2 }),
      weekStart.add({ days: day, hours: 21 }),
    ]).flat(),
    weekStart.subtract({ days: 5 }).add({ hours: 20 }),
    weekStart.add({ days: 9, hours: 20 }),
    // 3 more at 21:00 on Wednesday, so 4 streams start at the same time
    ...Array.from({ length: 3 }, () => weekStart.add({ days: 3, hours: 21 })),
  ];
  const getStatus = (start: Temporal.ZonedDateTime) =>
    Temporal.ZonedDateTime.compare(start, now) < 0
      ? ("ENDED" as const)
      : ("UPCOMING" as const);
  const seeds = [
    ...starts.map((start, index) => ({
      start,
      status: getStatus(start),
      // The last title is long enough to check that it does not run out of
      // the item
      title:
        index === starts.length - 1
          ? "〖FORKROAD〗右か左かすきなほうをえらんでね【#ななしいんく公式チャンネル同時視聴コラボ】"
          : `${SCHEDULE_TITLES[index % SCHEDULE_TITLES.length]} #${index + 1}`,
    })),
    // Both an ended stream (for 1.5 hours) and an upcoming one (drawn for an
    // hour) from 23:30 last past 00:00
    ...(
      [
        [4, "【スケジュール】木曜の深夜配信"],
        [6, "【スケジュール】土曜の深夜配信"],
      ] as const
    ).map(([day, title]) => {
      const start = weekStart.add({ days: day, hours: 23, minutes: 30 });

      return { start, status: getStatus(start), title };
    }),
    {
      start: getLiveScheduleStart(now),
      status: "LIVE" as const,
      title: "【スケジュール】ただいま配信中",
    },
  ];

  return seeds.flatMap(({ start, status, title }, index) => {
    const talent = talents[index % talents.length];
    const thumbnail = thumbnails[index % thumbnails.length];

    return talent
      ? [
          createVideo(context, {
            duration: status === "ENDED" ? "PT1H30M0S" : "P0D",
            published_at: toDBString(start),
            status,
            talent_id: talent.id,
            thumbnail_id: thumbnail?.id ?? null,
            title,
          }),
        ]
      : [];
  });
};
