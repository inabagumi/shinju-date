import { cacheLife } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase";
import { unwrapCount } from "@/lib/supabase/query";

/**
 * Counts the accounts whose latest backfill job failed. Accounts that were
 * deleted, or whose talent was deleted, are left out by the view.
 */
export const countVideoBackfillFailures = async (): Promise<number> => {
  "use cache: private";

  cacheLife("minutes");

  const supabaseClient = await createSupabaseServerClient();

  return unwrapCount(
    await supabaseClient
      .from("video_backfill_latest_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    "countVideoBackfillFailures"
  );
};
