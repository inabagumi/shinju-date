/**
 * タレントの一覧の絞り込みと並べ替えの値。クライアントコンポーネントでも使うため、
 * zod を使わずに定義する
 */

/** 状態の絞り込み */
export const TALENT_STATUS_FILTERS = [
  "not_deleted",
  "active",
  "retired",
  "deleted",
  "all",
] as const;

export type TalentStatusFilter = (typeof TALENT_STATUS_FILTERS)[number];

/** 最終更新日時の並べ替えの向き */
export const TALENT_SORT_ORDERS = ["asc", "desc"] as const;

export type TalentSortOrder = (typeof TALENT_SORT_ORDERS)[number];

/** 既定の値。この値のときは、URL にパラメータを付けない */
export const DEFAULT_TALENT_LIST_FILTERS = {
  sort: "desc",
  status: "not_deleted",
} as const satisfies {
  sort: TalentSortOrder;
  status: TalentStatusFilter;
};
