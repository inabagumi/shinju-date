// oxlint-disable-next-line import/default -- @shinju-date/database exports the Database type as a type-only default export, which this rule cannot see
import type DefaultDatabase from "@shinju-date/database";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isAdminUser } from "@/lib/admin-user";
import { getSafeRedirectPath, REDIRECT_PARAM } from "@/lib/redirect-path";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { withMockSessionCookie } from "@/lib/supabase/mock-session";

/**
 * Updates the session by refreshing the Supabase auth token if needed.
 * This function should be called in middleware to ensure authentication state
 * is properly maintained across requests. Users without the admin role are
 * treated as signed out.
 *
 * @param request - The incoming Next.js request
 * @returns A NextResponse with updated session cookies
 */
export const updateSession = async (
  request: NextRequest
): Promise<NextResponse> => {
  const { cookieOptions, key, url } = getSupabaseConfig();
  const response = NextResponse.next({
    request,
  });

  const supabaseClient = createServerClient<DefaultDatabase>(url, key, {
    cookies: {
      getAll() {
        return withMockSessionCookie(url, request.cookies.getAll());
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, { ...options, ...cookieOptions });
        }
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser();
  // 管理者ロールを持たないユーザーはログインしていないものとして扱う
  const isAdmin = !error && !!user && isAdminUser(user);

  if (request.nextUrl.pathname === "/login" && isAdmin) {
    const redirectPath = getSafeRedirectPath(
      request.nextUrl.searchParams.get(REDIRECT_PARAM)
    );

    return NextResponse.redirect(new URL(redirectPath, request.nextUrl), {
      headers: response.headers,
    });
  }

  if (request.nextUrl.pathname !== "/login" && !isAdmin) {
    const loginURL = new URL("/login", request.nextUrl);

    const redirectPath = getSafeRedirectPath(
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    );

    // ログイン後に元のページへ戻れるよう、クエリ文字列を含めて渡す
    if (redirectPath !== "/") {
      loginURL.searchParams.set(REDIRECT_PARAM, redirectPath);
    }

    return NextResponse.redirect(loginURL, {
      headers: response.headers,
    });
  }

  return response;
};
