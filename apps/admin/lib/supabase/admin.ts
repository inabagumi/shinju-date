import type { default as DefaultDatabase } from "@shinju-date/database";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { publicEnv, serverEnv } from "@/lib/env";

let supabaseAdminClient: SupabaseClient<DefaultDatabase> | undefined;

/**
 * The client with the service role key, which bypasses RLS. Use it only in
 * secure server contexts, after `requireAuthenticatedUser()`.
 *
 * Created on first use and reused afterwards, so that importing this module
 * does not create the client.
 */
export const getSupabaseAdminClient = (): SupabaseClient<DefaultDatabase> => {
  supabaseAdminClient ??= createClient<DefaultDatabase>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY
  );

  return supabaseAdminClient;
};
