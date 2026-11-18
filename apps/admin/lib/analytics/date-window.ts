import { TIME_ZONE } from "@shinju-date/constants";

/**
 * アナリティクスで選べる日付の決まり。画面の URL のパラメータ、CSV のエクスポート、
 * 期間を選ぶ部品が、同じ判定をするために、ここだけに置く。
 *
 * - 形式は `YYYY-MM-DD`
 * - 今日（`TIME_ZONE`）より先は選べない
 * - 今日を含めて `MAX_RANGE_DAYS` 日より前は選べない（集計を保存している期間）
 * - 開始日は終了日以前
 * - 期間は両端を含めて `MAX_RANGE_DAYS` 日まで
 *
 * クライアントコンポーネントからも読み込むため、zod などを読み込まない
 */

/** 選べる期間の最長の日数（両端を含む）。集計を保存している日数でもある */
export const MAX_RANGE_DAYS = 90;

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/u;

/** 日付が選べない理由。`'future'` は今日より先、`'too-old'` は保存している期間より前 */
export type DateError = "future" | "too-old";

/** 期間が選べない理由。`'reversed'` は開始日が終了日より後、`'too-long'` は最長の日数を超える */
export type DateRangeError = "reversed" | "too-long";

/** `TIME_ZONE` での今日 */
export const getToday = (): Temporal.PlainDate =>
  Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate();

/** 選べるいちばん古い日付。今日を含めて `MAX_RANGE_DAYS` 日ぶんをさかのぼった日 */
export const getEarliestDate = (
  today: Temporal.PlainDate = getToday()
): Temporal.PlainDate => today.subtract({ days: MAX_RANGE_DAYS - 1 });

/** 期間の指定がないときの期間（今日までの7日間） */
export const getDefaultDateRange = (): {
  startDate: string;
  endDate: string;
} => {
  const today = getToday();

  return {
    endDate: today.toString(),
    startDate: today.subtract({ days: 6 }).toString(),
  };
};

/**
 * 日付が、選べる範囲（いちばん古い日付から今日まで）にあるかを確かめる。
 * 問題がなければ `null`、あれば理由を返す
 */
export const validateDate = (
  date: Temporal.PlainDate,
  today: Temporal.PlainDate = getToday()
): DateError | null => {
  if (Temporal.PlainDate.compare(date, today) > 0) {
    return "future";
  }

  if (Temporal.PlainDate.compare(date, getEarliestDate(today)) < 0) {
    return "too-old";
  }

  return null;
};

/**
 * 文字列の形式（`YYYY-MM-DD`）だけを確かめる。選べる範囲にあるかは確かめない。
 * 問題がなければ日付、あれば（空の文字列を含む）`null` を返す
 */
export const parseDateFormat = (value: string): Temporal.PlainDate | null => {
  if (!DATE_FORMAT.test(value)) {
    return null;
  }

  try {
    return Temporal.PlainDate.from(value);
  } catch {
    // 2月30日のような、実在しない日付
    return null;
  }
};

/**
 * 文字列の形式（`YYYY-MM-DD`）と、選べる範囲にあるかを確かめる。
 * 問題がなければ日付、あれば `null` を返す
 */
export const parseDate = (
  value: string,
  today: Temporal.PlainDate = getToday()
): Temporal.PlainDate | null => {
  const date = parseDateFormat(value);

  if (!date) {
    return null;
  }

  return validateDate(date, today) === null ? date : null;
};

/**
 * 期間の順序と長さを確かめる。問題がなければ `null`、あれば理由を返す。
 * それぞれの日付が選べる範囲にあるかは、`parseDate` か `validateDate` で確かめる
 */
export const validateRange = (
  start: Temporal.PlainDate,
  end: Temporal.PlainDate
): DateRangeError | null => {
  if (Temporal.PlainDate.compare(start, end) > 0) {
    return "reversed";
  }

  const days = start.until(end, { largestUnit: "day" }).days + 1;

  if (days > MAX_RANGE_DAYS) {
    return "too-long";
  }

  return null;
};
