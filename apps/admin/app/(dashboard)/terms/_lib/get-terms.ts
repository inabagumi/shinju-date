import { cacheLife } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase";
import { unwrap } from "@/lib/supabase/query";

export default async function getTerms() {
  "use cache: private";

  cacheLife("minutes");

  const supabaseClient = await createSupabaseServerClient();

  return unwrap(
    await supabaseClient
      .from("terms")
      .select("id, readings, synonyms, term")
      .order("readings->0", {
        ascending: true,
      }),
    "getTerms"
  );
}
