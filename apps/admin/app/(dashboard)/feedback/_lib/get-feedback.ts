import type { Tables } from "@shinju-date/database";
import { cacheLife } from "next/cache";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { unwrap, unwrapOrNull } from "@/lib/supabase/query";

export interface FeatureRequestFilters {
  status?: Tables<"feature_requests">["status"];
  isRead?: boolean;
}

export async function getFeatureRequests(
  filters: FeatureRequestFilters = {}
): Promise<Tables<"feature_requests">[]> {
  "use cache: private";

  cacheLife("minutes");

  let query = getSupabaseAdminClient()
    .from("feature_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.isRead !== undefined) {
    query = query.eq("is_read", filters.isRead);
  }

  return unwrap(await query, "getFeatureRequests") ?? [];
}

export async function getFeatureRequestById(
  id: string
): Promise<Tables<"feature_requests"> | null> {
  "use cache: private";

  cacheLife("minutes");

  return unwrapOrNull(
    await getSupabaseAdminClient()
      .from("feature_requests")
      .select("*")
      .eq("id", id)
      .single(),
    "getFeatureRequestById"
  );
}
