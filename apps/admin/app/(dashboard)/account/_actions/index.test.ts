import { AuthApiError } from "@supabase/supabase-js";
import type { Session } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TypedSupabaseClient } from "@/lib/supabase";
import { setupActionTest, TEST_USER } from "@/test/action-harness";

import { updateUserEmailAction, updateUserPasswordAction } from "./index";

const test = setupActionTest();

/**
 * 予期しない例外のときに画面に出る文（`@/lib/action` の `ACTION_FAILED_ERROR_MESSAGE`）。
 * `@/lib/action` を読み込むと、認証のモックより先に `@/lib/auth` が読み込まれるため、
 * ここに書く
 */
const ACTION_FAILED_ERROR =
  "処理に失敗しました。時間をおいて、もう一度お試しください。";

const PASSWORD = "current-password";
const NEW_PASSWORD = "new-password";

type AuthClient = TypedSupabaseClient["auth"];

/** `supabaseClient.auth` の、アカウントのアクションが使うメソッド */
const auth = {
  signInWithPassword: vi.fn<AuthClient["signInWithPassword"]>(),
  updateUser: vi.fn<AuthClient["updateUser"]>(),
};
const supabaseClient = {
  auth: auth as Partial<AuthClient> as AuthClient,
} as Partial<TypedSupabaseClient> as TypedSupabaseClient;

const session: Session = {
  access_token: "access-token",
  expires_in: 3600,
  refresh_token: "refresh-token",
  token_type: "bearer",
  user: TEST_USER,
};

const signIn = (user: Partial<typeof TEST_USER> = {}): void => {
  test.requireAuthenticatedUser.mockResolvedValue({
    supabaseClient,
    user: { ...TEST_USER, ...user },
  });
};

const emailForm = (email: string): FormData => {
  const formData = new FormData();
  formData.set("email", email);
  return formData;
};

const passwordForm = ({
  confirmPassword = NEW_PASSWORD,
  currentPassword = PASSWORD,
  newPassword = NEW_PASSWORD,
} = {}): FormData => {
  const formData = new FormData();
  formData.set("currentPassword", currentPassword);
  formData.set("newPassword", newPassword);
  formData.set("confirmPassword", confirmPassword);
  return formData;
};

describe("account actions", () => {
  beforeEach(() => {
    auth.signInWithPassword.mockResolvedValue({
      data: { session, user: TEST_USER },
      error: null,
    });
    auth.updateUser.mockResolvedValue({
      data: { user: TEST_USER },
      error: null,
    });
    signIn();
  });

  describe("updateUserEmailAction()", () => {
    it("asks Supabase to send the confirmation to the new address", async () => {
      const result = await updateUserEmailAction(
        {},
        emailForm("new@example.com")
      );

      expect(result).toStrictEqual({ success: true });
      expect(auth.updateUser).toHaveBeenCalledWith(
        { email: "new@example.com" },
        { emailRedirectTo: expect.stringMatching(/\/api\/auth\/callback$/) }
      );
      test.expectRevalidated({ paths: ["/account"] });
    });

    it("returns an error for the address that is not valid", async () => {
      const result = await updateUserEmailAction({}, emailForm("invalid"));

      expect(result).toStrictEqual({
        errors: { email: ["メールアドレスの形式が正しくありません。"] },
      });
      expect(auth.updateUser).not.toHaveBeenCalled();
    });

    it("returns an error when Supabase fails to update the address", async () => {
      auth.updateUser.mockResolvedValue({
        data: { user: null },
        error: new AuthApiError("Email rate limit exceeded", 429, undefined),
      });

      const result = await updateUserEmailAction(
        {},
        emailForm("new@example.com")
      );

      expect(result).toStrictEqual({
        errors: { generic: ["メールアドレスの更新に失敗しました。"] },
      });
      test.expectNotRevalidated();
    });
  });

  describe("updateUserPasswordAction()", () => {
    it("updates the password after checking the current one", async () => {
      const result = await updateUserPasswordAction({}, passwordForm());

      expect(result).toStrictEqual({ success: true });
      expect(auth.signInWithPassword).toHaveBeenCalledWith({
        email: TEST_USER.email,
        password: PASSWORD,
      });
      expect(auth.updateUser).toHaveBeenCalledWith({ password: NEW_PASSWORD });
      expect(test.createAuditLog).toHaveBeenCalledWith(
        supabaseClient,
        "ACCOUNT_PASSWORD_UPDATE",
        TEST_USER.id
      );
      test.expectRevalidated({ paths: ["/account"] });
    });

    it("returns an error for the confirmation that does not match", async () => {
      const result = await updateUserPasswordAction(
        {},
        passwordForm({ confirmPassword: "other-password" })
      );

      expect(result).toStrictEqual({
        errors: {
          confirmPassword: [
            "新しいパスワードと確認用パスワードが一致しません。",
          ],
        },
      });
      expect(auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("returns an error for the current password that is wrong", async () => {
      auth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: new AuthApiError("Invalid login credentials", 400, undefined),
      });

      const result = await updateUserPasswordAction({}, passwordForm());

      expect(result).toStrictEqual({
        errors: { currentPassword: ["現在のパスワードが正しくありません。"] },
      });
      expect(auth.updateUser).not.toHaveBeenCalled();
      test.expectNoAuditLog();
    });

    it("returns an error for the user without an email address", async () => {
      signIn({ email: "" });

      const result = await updateUserPasswordAction({}, passwordForm());

      expect(result).toStrictEqual({
        errors: { generic: ["ユーザー情報の取得に失敗しました。"] },
      });
      expect(auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("logs the failure and returns the fixed message when the update fails", async () => {
      const error = new AuthApiError("Database error", 500, undefined);

      auth.updateUser.mockResolvedValue({ data: { user: null }, error });

      const result = await updateUserPasswordAction({}, passwordForm());

      expect(result).toStrictEqual({ error: ACTION_FAILED_ERROR });
      expect(test.logger.error).toHaveBeenCalledWith(
        "Server Action が失敗しました",
        { action: "updateUserPasswordAction", error }
      );
      test.expectNoAuditLog();
      test.expectNotRevalidated();
    });
  });
});
