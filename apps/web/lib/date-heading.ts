import { formatDate } from "@shinju-date/temporal-fns";

/*
 * 日付を表す文字列は、すべてこのファイルの関数で組み立てる。
 *
 * `toLocaleString` の出力はネイティブの Temporal と temporal-polyfill で
 * 異なり、ハイドレーションエラーの原因になるため使わない。
 */

/** 曜日の1文字の名前。`[0]` が月曜（`Temporal` の `dayOfWeek` が 1）にあたる */
export const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"] as const;

/** 日付の曜日の1文字の名前（「月」など） */
export const formatWeekday = (date: Temporal.PlainDate): string =>
  WEEKDAYS[date.dayOfWeek - 1] as string;

interface FormatShortDateOptions {
  /** 年を付ける（「2026/11/09（月）」） */
  year?: boolean | undefined;
}

/** 「11/09（月）」の形の日付。`year` が真なら「2026/11/09（月）」にする */
export const formatShortDate = (
  date: Temporal.PlainDate,
  { year = false }: FormatShortDateOptions = {}
): string =>
  `${formatDate(date, { includeYear: year })}（${formatWeekday(date)}）`;

interface FormatLongDateOptions {
  /** 曜日を付ける（「11月9日（月）」） */
  weekday?: boolean | undefined;
  /** 年を付ける（「2026年11月9日」） */
  year?: boolean | undefined;
}

/** 「11月9日」の形の日付。曜日と年は、オプションで付ける */
export const formatLongDate = (
  date: Temporal.PlainDate,
  { weekday = false, year = false }: FormatLongDateOptions = {}
): string => {
  const monthDay = `${date.month}月${date.day}日`;
  const withWeekday = weekday
    ? `${monthDay}（${formatWeekday(date)}）`
    : monthDay;

  return year ? `${date.year}年${withWeekday}` : withWeekday;
};

interface FormatRelativeDateOptions {
  /**
   * 今日・明日（・昨日）でない日付の形。`short` は `formatShortDate`
   * （「11/09（月）」）、`long` は `formatLongDate` に曜日を付けたもの
   * （「11月9日（月）」）
   */
  style: "long" | "short";
  /** 前日を「昨日」と書く */
  yesterday?: boolean | undefined;
}

/**
 * 一覧を日付で区切る見出しの文字列。今日・明日（`yesterday` が真なら昨日も）は
 * その言葉にし、それ以外は `style` の形の日付にする。`today` と年が違う日付には
 * 年も付ける。
 */
export const formatRelativeDate = (
  date: Temporal.PlainDate,
  today: Temporal.PlainDate,
  { style, yesterday = false }: FormatRelativeDateOptions
): string => {
  const { days } = today.until(date, { largestUnit: "day" });

  if (days === 0) {
    return "今日";
  }

  if (days === 1) {
    return "明日";
  }

  if (yesterday && days === -1) {
    return "昨日";
  }

  const year = date.year !== today.year;

  return style === "short"
    ? formatShortDate(date, { year })
    : formatLongDate(date, { weekday: true, year });
};
