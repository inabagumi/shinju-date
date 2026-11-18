import { twMerge } from "@shinju-date/ui";

import { describeRatings } from "../_lib/metric-ratings";
import type { DescribeRatingsOptions, Ratings } from "../_lib/metric-ratings";

interface MetricLegendProps extends DescribeRatingsOptions {
  /** 広い画面での列の数。既定は 2 */
  columns?: 2 | 4;
  /** 評価の表。値の判定（`rate`）に使うものと同じ表を渡す */
  ratings: Ratings;
  /** 凡例の見出し（「評価基準」など） */
  title: string;
}

/** 指標の評価の凡例。評価の表から、しきい値とラベルの一覧を描く */
export function MetricLegend({
  columns = 2,
  ratings,
  title,
  ...options
}: MetricLegendProps) {
  return (
    <dl
      className={twMerge(
        "mt-4 grid grid-cols-2 gap-x-4 text-caption text-muted",
        columns === 4 && "sm:grid-cols-4"
      )}
    >
      <dt className="col-span-full font-semibold">{title}</dt>
      {describeRatings(ratings, options).map((description) => (
        <dd key={description}>{description}</dd>
      ))}
    </dl>
  );
}
