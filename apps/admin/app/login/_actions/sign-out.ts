"use server";

import { redirect } from "next/navigation";

import type { FormState } from "@/components/form";
import { createSupabaseServerClient } from "@/lib/supabase";

export const signOutAction = async (): Promise<FormState> => {
  const supabaseClient = await createSupabaseServerClient();
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    return {
      errors: {
        generic: ["ログアウトに失敗しました。"],
      },
    };
  }

  redirect("/login");
};
