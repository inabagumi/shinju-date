import { TIME_ZONE } from "@shinju-date/constants";

import { formatLongDate } from "./date-heading";

/** The path of the schedule of the week that includes today */
export const SCHEDULE_PATH = "/schedule";

/** How many weeks after the current week the schedule can show */
export const SCHEDULE_WEEKS_AHEAD = 4;

/** `YYYY-MM-DD`, the only form `/schedule/[date]` accepts */
const SCHEDULE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

/**
 * Parse the date of `/schedule/[date]`. Returns `null` for values that are not
 * `YYYY-MM-DD` or are not a real date (such as `2026-02-30`).
 */
export const parseScheduleDate = (value: string): Temporal.PlainDate | null => {
  if (!SCHEDULE_DATE_PATTERN.test(value)) {
    return null;
  }

  try {
    return Temporal.PlainDate.from(value, { overflow: "reject" });
  } catch {
    return null;
  }
};

/**
 * The Sunday of the week that includes the date. Weeks start on Sunday, as
 * most calendars in Japan do.
 */
export const getWeekStart = (date: Temporal.PlainDate): Temporal.PlainDate =>
  // `dayOfWeek` is 1 for Monday and 7 for Sunday
  date.subtract({ days: date.dayOfWeek % 7 });

/** The 7 days of the week that starts on `weekStart`, from Sunday to Saturday */
export const getWeekDays = (
  weekStart: Temporal.PlainDate
): Temporal.PlainDate[] =>
  Array.from({ length: 7 }, (_, index) => weekStart.add({ days: index }));

/**
 * The path of the schedule. Without a date, it is the week that includes
 * today (`/schedule`). With one, it always points to the Sunday of the week,
 * so each week has a single URL.
 */
export const getSchedulePath = (weekStart?: Temporal.PlainDate): string => {
  if (!weekStart) {
    return SCHEDULE_PATH;
  }

  return `${SCHEDULE_PATH}/${getWeekStart(weekStart).toString()}`;
};

export interface ScheduleWeekRange {
  /** The Sunday of the first week that can be shown */
  first: Temporal.PlainDate;
  /** The Sunday of the last week that can be shown */
  last: Temporal.PlainDate;
}

interface GetScheduleWeekRangeOptions {
  /** The date the oldest video starts on, or `null` when there is no video */
  oldestDate: Temporal.PlainDate | null;
  today: Temporal.PlainDate;
}

/**
 * The weeks the schedule can show: from the week of the oldest video to
 * `SCHEDULE_WEEKS_AHEAD` weeks after the current week. Without any video, the
 * first week is the current week.
 */
export const getScheduleWeekRange = ({
  oldestDate,
  today,
}: GetScheduleWeekRangeOptions): ScheduleWeekRange => {
  const currentWeekStart = getWeekStart(today);
  const first = oldestDate ? getWeekStart(oldestDate) : currentWeekStart;

  return {
    first:
      Temporal.PlainDate.compare(first, currentWeekStart) > 0
        ? currentWeekStart
        : first,
    last: currentWeekStart.add({ weeks: SCHEDULE_WEEKS_AHEAD }),
  };
};

/** Whether the week that starts on `weekStart` is in the range */
export const isWeekInRange = (
  weekStart: Temporal.PlainDate,
  { first, last }: ScheduleWeekRange
): boolean =>
  Temporal.PlainDate.compare(weekStart, first) >= 0 &&
  Temporal.PlainDate.compare(weekStart, last) <= 0;

interface FormatWeekRangeOptions {
  /** Add the weekdays, as in `2026年11月8日（日）〜11月14日（土）` */
  withWeekdays?: boolean;
}

/**
 * The range of the week that starts on `weekStart`, such as
 * `2026年11月8日〜11月14日`. The year of the last day is written only when it
 * differs from that of the first day.
 */
export const formatWeekRange = (
  weekStart: Temporal.PlainDate,
  { withWeekdays = false }: FormatWeekRangeOptions = {}
): string => {
  const weekEnd = weekStart.add({ days: 6 });
  const start = formatLongDate(weekStart, {
    weekday: withWeekdays,
    year: true,
  });
  const end = formatLongDate(weekEnd, {
    weekday: withWeekdays,
    year: weekEnd.year !== weekStart.year,
  });

  return `${start}〜${end}`;
};

/** Minutes in a day, the height of the column of a day */
export const MINUTES_IN_DAY = 24 * 60;

/** How long an upcoming or live stream is shown, as its end is not known */
export const DEFAULT_LENGTH_MINUTES = 60;

/**
 * The shortest an item is drawn, so that a short video still has room for the
 * start time and the icon
 */
export const MIN_LENGTH_MINUTES = 30;

interface PlacedVideo {
  duration: string;
  published_at: string;
  status: string;
}

/**
 * How long the video takes on the schedule, in minutes: its duration for an
 * ended stream or a published video, and `DEFAULT_LENGTH_MINUTES` for an
 * upcoming or live one or one without a duration.
 */
export const getLengthMinutes = (video: PlacedVideo): number => {
  if (video.status === "ENDED" || video.status === "PUBLISHED") {
    const minutes = Temporal.Duration.from(video.duration).total({
      unit: "minute",
    });

    if (minutes > 0) {
      return minutes;
    }
  }

  return DEFAULT_LENGTH_MINUTES;
};

/**
 * The most days a video is drawn on: the day it starts on and the 2 days
 * after it, which a stream of more than 24 hours (such as one for 30 hours
 * from 20:00) covers. The part after them is cut, so the schedule of a week
 * fetches the videos from 2 days before the week (`fetchScheduleVideos`).
 */
export const MAX_SCHEDULE_DAYS = 3;

export interface ScheduleDayPart {
  /** The day of the part, in `TIME_ZONE` */
  date: Temporal.PlainDate;
  /** When the part ends, in minutes from 00:00 of the day (at most 24:00) */
  end: number;
  /** When the part starts, in minutes from 00:00 of the day */
  start: number;
}

/**
 * The parts of the video on each day it is drawn on, from the day it starts
 * on. It lasts as long as `getLengthMinutes` from its start, and a video that
 * crosses 00:00 in `TIME_ZONE` has a part from 00:00 on each day after it, up
 * to `MAX_SCHEDULE_DAYS` days.
 */
export const getDayParts = (video: PlacedVideo): ScheduleDayPart[] => {
  const startAt = Temporal.Instant.from(video.published_at).toZonedDateTimeISO(
    TIME_ZONE
  );
  const startDate = startAt.toPlainDate();
  const start = startAt.hour * 60 + startAt.minute;
  const end = start + getLengthMinutes(video);
  const parts: ScheduleDayPart[] = [];

  for (let day = 0; day < MAX_SCHEDULE_DAYS; day += 1) {
    const dayStart = day * MINUTES_IN_DAY;

    // The days after the start have a part only when the video lasts past
    // 00:00 of the day
    if (day > 0 && end <= dayStart) {
      break;
    }

    parts.push({
      date: startDate.add({ days: day }),
      end: Math.min(end - dayStart, MINUTES_IN_DAY),
      start: Math.max(start - dayStart, 0),
    });
  }

  return parts;
};

export interface ScheduleLayout<T> {
  /** The column of the item among the overlapping items, from 0 */
  column: number;
  /** How many columns the overlapping items share */
  columns: number;
  /** Whether the item started on an earlier day, and the part is from 00:00 */
  continued: boolean;
  /** Whether the item lasts past the end of the day, on the next day */
  continues: boolean;
  item: T;
  /** How long the part is drawn, in minutes (cut at the end of the day) */
  length: number;
  /** When the part starts, in minutes from 00:00 in `TIME_ZONE` */
  start: number;
}

/**
 * Place the parts of the videos on `date` (`getDayParts`) on the time axis,
 * as a calendar does: each starts at its start time (00:00 for the videos
 * from earlier days) and is as long as the part (at least
 * `MIN_LENGTH_MINUTES`, and cut at the end of the day). The videos without a
 * part on the day are left out. The parts that overlap share the width of the
 * day side by side, whether the videos start on the day or not.
 */
export const layoutDay = <T extends PlacedVideo>(
  videos: readonly T[],
  date: Temporal.PlainDate
): ScheduleLayout<T>[] => {
  const placed = videos
    .flatMap((item) => {
      const parts = getDayParts(item);
      const index = parts.findIndex((part) => part.date.equals(date));
      const part = parts[index];

      if (!part) {
        return [];
      }

      const length = Math.min(
        Math.max(part.end - part.start, MIN_LENGTH_MINUTES),
        MINUTES_IN_DAY - part.start
      );

      return [
        {
          column: 0,
          columns: 1,
          continued: index > 0,
          continues: index < parts.length - 1,
          item,
          length,
          start: part.start,
        },
      ];
    })
    .toSorted((a, b) => a.start - b.start || b.length - a.length);

  // Split the videos into clusters of the ones that overlap each other, and
  // give each video the first column that is free at its start
  let cluster: typeof placed = [];
  let clusterEnd = 0;
  let columnEnds: number[] = [];

  const closeCluster = () => {
    for (const layout of cluster) {
      layout.columns = columnEnds.length;
    }

    cluster = [];
    columnEnds = [];
  };

  for (const layout of placed) {
    if (cluster.length > 0 && layout.start >= clusterEnd) {
      closeCluster();
    }

    const end = layout.start + layout.length;
    const column = columnEnds.findIndex(
      (columnEnd) => columnEnd <= layout.start
    );

    layout.column = column === -1 ? columnEnds.length : column;
    columnEnds[layout.column] = end;
    cluster.push(layout);
    clusterEnd = cluster.length === 1 ? end : Math.max(clusterEnd, end);
  }

  closeCluster();

  return placed;
};
