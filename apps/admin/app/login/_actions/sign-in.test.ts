import { AuthError } from "@supabase/supabase-js";
import type { AuthTokenResponsePassword, User } from "@supabase/supabase-js";
import type { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { createSupabaseServerClient } from "@/lib/supabase";

import { signInAction } from "./sign-in";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type AuthClient = SupabaseClient["auth"];

const { redirectMock, signInWithPasswordMock, signOutMock } = vi.hoisted(
  () => ({
    redirectMock: vi.fn<typeof redirect>(),
    signInWithPasswordMock: vi.fn<AuthClient["signInWithPassword"]>(),
    signOutMock: vi.fn<AuthClient["signOut"]>(),
  })
);

vi.mock(import("next/navigation"), () => ({
  redirect: redirectMock,
}));

vi.mock(import("@/lib/supabase"), () => ({
  createSupabaseServerClient: vi
    .fn<typeof createSupabaseServerClient>()
    .mockResolvedValue({
      auth: {
        signInWithPassword: signInWithPasswordMock,
        signOut: signOutMock,
      } as Partial<AuthClient> as AuthClient,
    } as Partial<SupabaseClient> as SupabaseClient),
}));

/** The response of `signInWithPassword()` for a user with this metadata. */
const signedIn = (
  id: string,
  appMetadata: User["app_metadata"]
): AuthTokenResponsePassword => {
  const user: User = {
    app_metadata: appMetadata,
    aud: "authenticated",
    created_at: "2024-01-01T00:00:00Z",
    id,
    user_metadata: {},
  };

  return {
    data: {
      session: {
        access_token: "access-token",
        expires_in: 3600,
        refresh_token: "refresh-token",
        token_type: "bearer",
        user,
      },
      user,
    },
    error: null,
  };
};

const createFormData = (next?: string): FormData => {
  const formData = new FormData();
  formData.set("email", "user@example.com");
  formData.set("password", "password123");

  if (next !== undefined) {
    formData.set("next", next);
  }

  return formData;
};

describe(signInAction, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signOutMock.mockResolvedValue({ error: null });
  });

  it("redirects to the dashboard when an admin signs in", async () => {
    signInWithPasswordMock.mockResolvedValue(
      signedIn("admin-id", { role: "admin" })
    );

    await signInAction({}, createFormData());

    expect(redirectMock).toHaveBeenCalledWith("/");
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("redirects to the requested page after signing in", async () => {
    signInWithPasswordMock.mockResolvedValue(
      signedIn("admin-id", { role: "admin" })
    );

    await signInAction({}, createFormData("/analytics/click?from=2025-11-01"));

    expect(redirectMock).toHaveBeenCalledWith(
      "/analytics/click?from=2025-11-01"
    );
  });

  it.each(["https://example.com/", "//example.com", "/.//example.com", "/.//"])(
    "redirects to the dashboard instead of the external URL %s",
    async (next) => {
      signInWithPasswordMock.mockResolvedValue(
        signedIn("admin-id", { role: "admin" })
      );

      await signInAction({}, createFormData(next));

      expect(redirectMock).toHaveBeenCalledWith("/");
    }
  );

  it("signs out and returns an error when the user is not an admin", async () => {
    signInWithPasswordMock.mockResolvedValue(
      signedIn("user-id", { provider: "email" })
    );

    const result = await signInAction({}, createFormData());

    expect(result).toStrictEqual({
      errors: {
        generic: ["このアカウントには管理画面を利用する権限がありません。"],
      },
    });
    expect(signOutMock).toHaveBeenCalledWith();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("returns an error when the credentials are wrong", async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: { session: null, user: null },
      error: new AuthError("Invalid login credentials"),
    });

    const result = await signInAction({}, createFormData());

    expect(result).toStrictEqual({
      errors: {
        generic: ["メールアドレスかパスワードが正しくありません。"],
      },
    });
    expect(signOutMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("returns the errors for each field when the values are invalid", async () => {
    const formData = new FormData();
    formData.set("email", "invalid");
    formData.set("password", "short");

    const result = await signInAction({}, formData);

    expect(result).toStrictEqual({
      errors: {
        email: ["メールアドレスの形式が正しくありません。"],
        password: ["パスワードは8文字以上入力する必要があります。"],
      },
    });
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });

  it("returns the errors for each field when the values are missing", async () => {
    const result = await signInAction({}, new FormData());

    expect(result).toStrictEqual({
      errors: {
        email: ["メールアドレスは必須です。"],
        password: ["パスワードは必須です。"],
      },
    });
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });
});
