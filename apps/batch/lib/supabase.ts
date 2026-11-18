// oxlint-disable-next-line import/default -- the default export is type-only (`export type { Database as default }`), which the rule does not see
import type DefaultDatabase from "@shinju-date/database";
import retryableFetch from "@shinju-date/retryable-fetch";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { serverEnv } from "./env";

export type TypedSupabaseClient<Database = DefaultDatabase> =
  SupabaseClient<Database>;

export const createSupabaseClient = <Database = DefaultDatabase>(
  url: string | undefined = serverEnv.NEXT_PUBLIC_SUPABASE_URL,
  key: string | undefined = serverEnv.SUPABASE_SERVICE_ROLE_KEY,
  options?: NonNullable<Parameters<typeof createClient<Database>>[2]>
): SupabaseClient<Database> => {
  if (!url || !key) {
    throw new TypeError("Supabase URL and key are required.");
  }

  return createClient<Database>(url, key, {
    ...options,
    global: {
      ...options?.global,
      fetch: options?.global?.fetch ?? retryableFetch,
    },
  });
};

export const supabaseClient = createSupabaseClient();
