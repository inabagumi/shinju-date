import type { BadgeProps } from "@shinju-date/ui";

/** 評価の1段。値が `min` 以上で、1つ上の段の `min` より小さいときに、この段に当たる */
export interface Rating {
  label: string;
  /** この段の下限（この値を含む） */
  min: number;
}

/**
 * 評価の表。`min` の大きい順に並べる。
 * 最後の行は、上の段に当たらなかった値のすべてを受ける
 */
export type Ratings<R extends Rating = Rating> = readonly [R, ...R[]];

/** `Badge` で表示する評価の1段。良し悪しの意味で色を選ぶ */
interface BadgeRating extends Rating {
  variant: NonNullable<BadgeProps["variant"]>;
}

/** 評価に、値の読み方の説明を添える1段 */
interface DescribedRating extends Rating {
  description: string;
}

/** 検索からの離脱率（%）。高いほど悪い */
export const EXIT_RATE_RATINGS = [
  { label: "要改善", min: 70, variant: "danger" },
  { label: "注意", min: 50, variant: "warning" },
  { label: "普通", min: 30, variant: "neutral" },
  { label: "良好", min: 0, variant: "success" },
] as const satisfies Ratings<BadgeRating>;

/** 検索利用率（%）。高いほど良い */
export const ENGAGEMENT_RATE_RATINGS = [
  { label: "優秀", min: 30 },
  { label: "良好", min: 20 },
  { label: "平均的", min: 10 },
  { label: "改善が必要", min: 0 },
] as const satisfies Ratings;

/** リピート検索率（1セッションあたりの検索回数） */
export const REPEAT_SEARCH_RATE_RATINGS = [
  {
    description:
      "ユーザーが積極的に情報を探しています。検索結果の品質を継続的に改善し、ユーザーの期待に応えましょう。",
    label: "高いエンゲージメント",
    min: 3,
  },
  {
    description:
      "ユーザーは複数の検索を行いながら、必要な情報を見つけています。検索体験は良好です。",
    label: "適度なエンゲージメント",
    min: 2,
  },
  {
    description:
      "ユーザーは基本的に一度の検索で満足しています。標準的な検索パターンです。",
    label: "標準的",
    min: 1.5,
  },
  {
    description: "ユーザーの検索活動が少ないか、一度の検索で満足しています。",
    label: "低い活動",
    min: 0,
  },
] as const satisfies Ratings<DescribedRating>;

/**
 * 値に当たる行を返す。
 * どの行の `min` にも届かない値は、最後の行（いちばん下の段）に当たる
 */
export const rate = <T extends Ratings>(
  value: number,
  ratings: T
): T[number] => {
  let lowest: T[number] = ratings[0];

  for (const rating of ratings) {
    if (value >= rating.min) {
      return rating;
    }

    lowest = rating;
  }

  return lowest;
};

export interface DescribeRatingsOptions {
  /** しきい値を表示するときの、小数の桁数。既定は 0（整数） */
  fractionDigits?: number;
  /** 並べる順。既定は、表と同じ `descending`（しきい値の大きい順） */
  order?: "ascending" | "descending";
  /** しきい値の後ろに付ける単位（`%`、`回` など） */
  unit: string;
}

/**
 * 凡例の文（「30%未満: 良好」「30-49%: 普通」「70%以上: 要改善」など）の配列を作る。
 * 範囲の上端は、1つ上の段の下限から、表示する桁の最小の刻みを引いた値になる
 */
export const describeRatings = (
  ratings: Ratings,
  { fractionDigits = 0, order = "descending", unit }: DescribeRatingsOptions
): string[] => {
  const step = 10 ** -fractionDigits;
  const format = (value: number) => value.toFixed(fractionDigits);

  const descriptions = ratings.map((rating, index) => {
    const upper = ratings[index - 1];

    if (!upper) {
      return `${format(rating.min)}${unit}以上: ${rating.label}`;
    }

    if (index === ratings.length - 1) {
      return `${format(upper.min)}${unit}未満: ${rating.label}`;
    }

    return `${format(rating.min)}-${format(upper.min - step)}${unit}: ${rating.label}`;
  });

  return order === "ascending" ? descriptions.reverse() : descriptions;
};
