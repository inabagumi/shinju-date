import { z } from "zod";

import {
  enumParamSchema,
  searchTextParamSchema,
} from "@/lib/search-params-schema";

import {
  DEFAULT_TALENT_LIST_FILTERS,
  TALENT_SORT_ORDERS,
  TALENT_STATUS_FILTERS,
} from "./talent-list-filters";

/**
 * タレントの一覧の URL のパラメータのスキーマ。正しくない値は、既定の値にする
 */
export const talentSearchParamsSchema = z.object({
  search: searchTextParamSchema(),
  sort: enumParamSchema(TALENT_SORT_ORDERS, DEFAULT_TALENT_LIST_FILTERS.sort),
  status: enumParamSchema(
    TALENT_STATUS_FILTERS,
    DEFAULT_TALENT_LIST_FILTERS.status
  ),
});

export type TalentSearchParams = z.infer<typeof talentSearchParamsSchema>;
