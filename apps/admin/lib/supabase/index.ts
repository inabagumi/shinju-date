import type { default as DefaultDatabase } from "@shinju-date/database";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getSupabaseConfig } from "@/lib/supabase/config";
import { withMockSessionCookie } from "@/lib/supabase/mock-session";

export type TypedSupabaseClient<Database = DefaultDatabase> =
  SupabaseClient<Database>;

/**
 * Creates a Supabase client for use in Server Components and Server Actions.
 * This function properly handles cookies for authentication.
 */
export async function createSupabaseServerClient<
  Database = DefaultDatabase,
>(): Promise<SupabaseClient<Database>> {
  const { cookieOptions, key, url } = getSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return withMockSessionCookie(url, cookieStore.getAll());
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, { ...options, ...cookieOptions });
          }
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}
