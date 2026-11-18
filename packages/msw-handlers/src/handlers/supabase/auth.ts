import { HttpResponse, http } from "msw";

import { MOCK_SUPABASE_SESSION, MOCK_SUPABASE_USER } from "../../session.js";

/** The handlers of Supabase Auth (`/auth/v1/*`). */
export const authHandlers = [
  http.get(
    "https://fake.supabase.test/auth/v1/user",
    ({ request, cookies }) => {
      // Check for authentication in multiple ways:
      // 1. Environment variable for forced authentication
      // 2. Authorization header with bearer token
      // 3. Supabase auth cookies (pattern: sb-*-auth-token)
      const authHeader = request.headers.get("authorization");
      const hasValidToken =
        authHeader?.startsWith("Bearer ") &&
        authHeader.includes("mock_access_token");

      const hasAuthCookie = Object.keys(cookies).some(
        (key) =>
          (key.includes("sb-") && key.includes("-auth-token")) ||
          key === "sb-access-token"
      );

      const isAuthenticated =
        process.env["MSW_SUPABASE_AUTHENTICATED"] === "true" ||
        hasValidToken ||
        hasAuthCookie;

      if (!isAuthenticated) {
        return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      return HttpResponse.json(MOCK_SUPABASE_USER);
    }
  ),

  http.post("https://fake.supabase.test/auth/v1/token", async ({ request }) => {
    const url = new URL(request.url);
    const grantType = url.searchParams.get("grant_type");

    if (grantType === "password") {
      const body = (await request.json()) as {
        email?: string;
        password?: string;
      };

      if (
        body.email === "admin@example.com" &&
        body.password === "password123"
      ) {
        const headers = new Headers({
          "Content-Type": "application/json",
        });
        headers.append(
          "Set-Cookie",
          "sb-access-token=mock_access_token; Path=/; Max-Age=3600; SameSite=Lax"
        );
        headers.append(
          "Set-Cookie",
          "sb-refresh-token=mock_refresh_token; Path=/; Max-Age=604800; SameSite=Lax"
        );

        return HttpResponse.json(MOCK_SUPABASE_SESSION, {
          headers,
          status: 200,
        });
      }
      return HttpResponse.json(
        {
          error: "invalid_grant",
          error_description: "Invalid credentials",
        },
        { status: 400 }
      );
    }

    return HttpResponse.json(
      {
        error: "unsupported_grant_type",
        error_description: "Unsupported grant_type",
      },
      { status: 400 }
    );
  }),

  // Session endpoint - for refreshing tokens
  http.get("https://fake.supabase.test/auth/v1/session", ({ request }) => {
    const authHeader = request.headers.get("authorization");
    const hasValidToken =
      authHeader?.startsWith("Bearer ") && authHeader.includes("mock");

    if (
      !hasValidToken &&
      process.env["MSW_SUPABASE_AUTHENTICATED"] !== "true"
    ) {
      return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return HttpResponse.json(MOCK_SUPABASE_SESSION);
  }),

  http.post("https://fake.supabase.test/auth/v1/logout", () => {
    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      "sb-access-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
    );
    headers.append(
      "Set-Cookie",
      "sb-refresh-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
    );

    return new HttpResponse(null, {
      headers,
      status: 204,
    });
  }),
];
