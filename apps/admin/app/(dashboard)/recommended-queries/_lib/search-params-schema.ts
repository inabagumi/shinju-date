import { z } from "zod";

import { searchTextParamSchema } from "@/lib/search-params-schema";

/**
 * おすすめクエリの一覧の URL のパラメータのスキーマ
 */
export const recommendedQueriesSearchParamsSchema = z.object({
  search: searchTextParamSchema(),
});

export type RecommendedQueriesSearchParams = z.infer<
  typeof recommendedQueriesSearchParamsSchema
>;
