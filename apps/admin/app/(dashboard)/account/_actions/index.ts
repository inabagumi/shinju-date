"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { ActionError, adminFormAction } from "@/lib/action";
import { createAuditLog } from "@/lib/audit-log";
import { publicEnv } from "@/lib/env";

const emailSchema = z.object({
  email: z.email({
    message: "メールアドレスの形式が正しくありません。",
  }),
});

const passwordSchema = z
  .object({
    confirmPassword: z
      .string({ message: "パスワードの確認は必須です。" })
      .min(8, "パスワードは8文字以上入力する必要があります。"),
    currentPassword: z
      .string({ message: "現在のパスワードは必須です。" })
      .min(8, "パスワードは8文字以上入力する必要があります。"),
    newPassword: z
      .string({ message: "新しいパスワードは必須です。" })
      .min(8, "パスワードは8文字以上入力する必要があります。"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "新しいパスワードと確認用パスワードが一致しません。",
    path: ["confirmPassword"],
  });

export const updateUserEmailAction = adminFormAction(
  "updateUserEmailAction",
  emailSchema,
  async ({ supabaseClient }, { email }) => {
    // Update email - this will send a confirmation email to the new address
    // The email won't be changed until the user clicks the confirmation link
    // Audit log will be created in the callback handler after email confirmation
    const { error } = await supabaseClient.auth.updateUser(
      { email },
      {
        emailRedirectTo: `${publicEnv.NEXT_PUBLIC_BASE_URL}/api/auth/callback`,
      }
    );

    if (error) {
      throw new ActionError("メールアドレスの更新に失敗しました。");
    }

    revalidatePath("/account");
  }
);

export const updateUserPasswordAction = adminFormAction(
  "updateUserPasswordAction",
  passwordSchema,
  async (
    { supabaseClient, user: currentUser },
    { currentPassword, newPassword }
  ) => {
    if (!currentUser.email) {
      throw new ActionError("ユーザー情報の取得に失敗しました。");
    }

    // Verify current password by attempting to sign in
    // Note: Supabase doesn't provide a dedicated password verification API,
    // so we use signInWithPassword. This will refresh the session.
    const { data: signInData, error: verifyError } =
      await supabaseClient.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword,
      });

    if (verifyError || !signInData.session) {
      throw new ActionError("現在のパスワードが正しくありません。", {
        field: "currentPassword",
      });
    }

    // Update password using the authenticated session
    const { error } = await supabaseClient.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw error;
    }

    // Log password change (without storing the actual password for security)
    await createAuditLog(
      supabaseClient,
      "ACCOUNT_PASSWORD_UPDATE",
      currentUser.id
    );

    revalidatePath("/account");
  }
);
