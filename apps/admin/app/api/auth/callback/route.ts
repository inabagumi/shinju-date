import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isAdminUser } from "@/lib/admin-user";
import { createAuditLog } from "@/lib/audit-log";
import { getSafeRedirectPath, REDIRECT_PARAM } from "@/lib/redirect-path";
import { createSupabaseServerClient } from "@/lib/supabase";

export const GET = async (request: NextRequest): Promise<Response> => {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeRedirectPath(
    searchParams.get(REDIRECT_PARAM),
    "/account"
  );

  if (code) {
    const supabaseClient = await createSupabaseServerClient();

    // Exchange code for session
    const { data, error } =
      await supabaseClient.auth.exchangeCodeForSession(code);

    if (!error && data.user && isAdminUser(data.user)) {
      // Check if this is an email change event
      // Supabase sends the user with the new email after confirmation
      const user = data.user;

      // Only log if user has an email
      if (user.email) {
        // Log the email change to audit log
        // Note: We can't get the old email here, but we log that the change was confirmed
        await createAuditLog(supabaseClient, "ACCOUNT_EMAIL_UPDATE", user.id, {
          changes: {
            after: { email: user.email },
          },
          entityName: user.email,
        });
      }

      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // If there's an error or no code, redirect to login
  return NextResponse.redirect(new URL("/login", request.url));
};
