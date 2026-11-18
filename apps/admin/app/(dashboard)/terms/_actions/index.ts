"use server";

import { CACHE_TAGS } from "@shinju-date/constants";
import { revalidateTags } from "@shinju-date/web-cache";
import { revalidatePath } from "next/cache";

import {
  ActionError,
  type ActionResult,
  adminAction,
  adminFormAction,
} from "@/lib/action";
import { createAuditLog } from "@/lib/audit-log";

import { termSchema, updateTermSchema } from "../_lib/schema";

const ID_REQUIRED_ERROR = "IDが指定されていません。";

async function revalidateTerms(): Promise<void> {
  revalidatePath("/terms");
  await revalidateTags([CACHE_TAGS.VIDEOS]);
}

export const createTermAction = adminFormAction(
  "createTermAction",
  termSchema,
  async ({ supabaseClient }, { readings, synonyms, term }) => {
    const { data: newTerm, error } = await supabaseClient
      .from("terms")
      .insert({ readings, synonyms, term })
      .select("id, term")
      .single();

    if (error) {
      throw error;
    }

    await createAuditLog(supabaseClient, "TERM_CREATE", newTerm.id, {
      entityName: newTerm.term,
    });

    await revalidateTerms();
  }
);

export const updateTermAction = adminFormAction(
  "updateTermAction",
  updateTermSchema,
  async ({ supabaseClient }, { id, readings, synonyms, term }) => {
    const { data: updatedTerm, error } = await supabaseClient
      .from("terms")
      .update({
        readings,
        synonyms,
        term,
      })
      .eq("id", id)
      .select("term")
      .single();

    if (error) {
      throw error;
    }

    await createAuditLog(supabaseClient, "TERM_UPDATE", id, {
      entityName: updatedTerm.term,
    });

    await revalidateTerms();
  },
  // `id` は隠しフィールドで、画面に対応する入力欄がない
  { hiddenFields: ["id"] }
);

export const deleteTermAction = adminAction(
  "deleteTermAction",
  async ({ supabaseClient }, id: string): Promise<ActionResult> => {
    if (!id) {
      throw new ActionError(ID_REQUIRED_ERROR);
    }

    const { data: deletedTerm, error } = await supabaseClient
      .from("terms")
      .delete()
      .eq("id", id)
      .select("term")
      .single();

    if (error) {
      throw error;
    }

    await createAuditLog(supabaseClient, "TERM_DELETE", id, {
      entityName: deletedTerm.term,
    });

    await revalidateTerms();

    return { success: true };
  }
);
