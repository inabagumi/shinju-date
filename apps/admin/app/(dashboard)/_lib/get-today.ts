import { TIME_ZONE } from "@shinju-date/constants";
import { cacheLife } from "next/cache";

/**
 * 今日の日付（`TIME_ZONE` の `YYYY-MM-DD`）を返す。
 *
 * プリレンダリングの中で現在の時刻を読むとエラーになるため、キャッシュの中で
 * 読む
 */
export const getToday = async (): Promise<string> => {
  "use cache: private";

  cacheLife("minutes");

  return Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate().toString();
};
