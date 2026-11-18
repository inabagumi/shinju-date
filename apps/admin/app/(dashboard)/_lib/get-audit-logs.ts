import { cacheLife } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase";
import { unwrap } from "@/lib/supabase/query";

export type Log = Awaited<ReturnType<typeof getAuditLogs>>[number];

export async function getAuditLogs(limit = 10) {
  "use cache: private";

  cacheLife("minutes");

  const supabaseClient = await createSupabaseServerClient();

  return unwrap(
    await supabaseClient.rpc("get_audit_logs", {
      p_limit: limit,
    }),
    "getAuditLogs"
  );
}
