"use server";

import { CACHE_TAGS, REDIS_KEYS } from "@shinju-date/constants";
import { revalidateTags } from "@shinju-date/web-cache";
import { revalidatePath } from "next/cache";

import { adminAction, parseActionInput } from "@/lib/action";
import type { ActionResult } from "@/lib/action";
import { createAuditLog } from "@/lib/audit-log";
import { getRedisClient } from "@/lib/redis";

import { recommendedQuerySchema } from "../_lib/schema";

async function revalidateRecommendedQueries(): Promise<void> {
  revalidatePath("/recommended-queries");
  revalidatePath("/", "page");
  await revalidateTags([CACHE_TAGS.RECOMMENDATION_QUERIES]);
}

export const addQueryAction = adminAction(
  "addQueryAction",
  async ({ supabaseClient }, query: string): Promise<ActionResult> => {
    const trimmedQuery = parseActionInput(recommendedQuerySchema, query);

    await getRedisClient().sadd(
      REDIS_KEYS.QUERIES_MANUAL_RECOMMENDED,
      trimmedQuery
    );

    await createAuditLog(supabaseClient, "RECOMMENDED_QUERY_CREATE", null, {
      entityName: trimmedQuery,
    });

    await revalidateRecommendedQueries();

    return { success: true };
  }
);

export const deleteQueryAction = adminAction(
  "deleteQueryAction",
  async ({ supabaseClient }, query: string): Promise<ActionResult> => {
    // 追加のときに前後の空白を除いているので、除いた値で削除する
    const trimmedQuery = parseActionInput(recommendedQuerySchema, query);

    await getRedisClient().srem(
      REDIS_KEYS.QUERIES_MANUAL_RECOMMENDED,
      trimmedQuery
    );

    await createAuditLog(supabaseClient, "RECOMMENDED_QUERY_DELETE", null, {
      entityName: trimmedQuery,
    });

    await revalidateRecommendedQueries();

    return { success: true };
  }
);
