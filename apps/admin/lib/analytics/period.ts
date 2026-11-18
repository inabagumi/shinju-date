import type { DateRange } from "./redis";

/**
 * 集計の期間（両端を含む、`YYYY-MM-DD`）。1日だけのときは、`start` と `end` が
 * 同じ日。取得関数のキャッシュのキーにするため、`Temporal.PlainDate` ではなく
 * 文字列で持つ（`Temporal` のオブジェクトはキャッシュのキーにできない）
 */
export interface Period {
  end: string;
  start: string;
}

/** 期間で集計する取得関数の引数 */
export interface PeriodQuery {
  range: Period;
}

/** 期間で集計し、上位の件数を返す取得関数の引数 */
export interface RankingQuery extends PeriodQuery {
  /** 返す件数の上限。既定は `DEFAULT_RANKING_LIMIT` */
  limit?: number;
}

/** ランキングの件数の既定 */
export const DEFAULT_RANKING_LIMIT = 20;

/** 文字列の期間を、`Temporal.PlainDate` の期間に直す */
export const toDateRange = ({ end, start }: Period): DateRange => ({
  end: Temporal.PlainDate.from(end),
  start: Temporal.PlainDate.from(start),
});
