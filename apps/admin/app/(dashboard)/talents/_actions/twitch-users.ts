"use server";

import { adminAction, adminFormAction, parseActionInput } from "@/lib/action";
import { linkAccount, unlinkAccount } from "@/lib/talent-accounts";

import {
  addTwitchUserSchema,
  talentAccountIdSchema,
  talentIdSchema,
} from "../_lib/talent-schema";

export const addTwitchUserAction = adminFormAction(
  "addTwitchUserAction",
  addTwitchUserSchema,
  async ({ supabaseClient }, { talent_id, twitch_user }) => {
    await linkAccount("twitch", {
      input: twitch_user,
      supabaseClient,
      talentId: talent_id,
    });
  }
);

export const removeTwitchUserAction = adminAction(
  "removeTwitchUserAction",
  async ({ supabaseClient }, accountId: string, talentId: string) => {
    await unlinkAccount("twitch", {
      accountId: parseActionInput(talentAccountIdSchema, accountId),
      supabaseClient,
      talentId: parseActionInput(talentIdSchema, talentId),
    });

    return { success: true };
  }
);
