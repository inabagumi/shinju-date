import { z } from "zod";

import { searchTextParamSchema } from "@/lib/search-params-schema";

/**
 * 用語の一覧の URL のパラメータのスキーマ
 */
export const termsSearchParamsSchema = z.object({
  search: searchTextParamSchema(),
});

export type TermsSearchParams = z.infer<typeof termsSearchParamsSchema>;
