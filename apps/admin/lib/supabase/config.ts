import type { CookieOptions } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";

interface SupabaseConfig {
  /**
   * Applied on top of the options Supabase gives each session cookie. The
   * cookies are sent only to this site and cannot be read by scripts.
   */
  cookieOptions: CookieOptions;
  /** The anonymous key, which RLS restricts. */
  key: string;
  url: string;
}

/**
 * The settings of the clients that act as the signed-in user, shared by
 * `createSupabaseServerClient()` and the proxy.
 */
export const getSupabaseConfig = (): SupabaseConfig => ({
  cookieOptions: {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env["NODE_ENV"] === "production",
  },
  key: publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  url: publicEnv.NEXT_PUBLIC_SUPABASE_URL,
});
