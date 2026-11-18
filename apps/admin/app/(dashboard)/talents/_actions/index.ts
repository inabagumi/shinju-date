"use server";

import { CACHE_TAGS } from "@shinju-date/constants";
import type { Tables, TablesUpdate } from "@shinju-date/database";
import { logger } from "@shinju-date/logger";
import { toDBString } from "@shinju-date/temporal-fns";
import { revalidateTags } from "@shinju-date/web-cache";
import { revalidatePath } from "next/cache";

import {
  ActionError,
  type ActionResult,
  adminAction,
  adminFormAction,
  parseActionInput,
} from "@/lib/action";
import { type AuditAction, createAuditLog } from "@/lib/audit-log";
import type { AuthenticatedContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isNotFoundError } from "@/lib/supabase/query";
import { linkAccount, resolveAccount } from "@/lib/talent-accounts";

import {
  createTalentSchema,
  talentIdSchema,
  updateTalentSchema,
} from "../_lib/talent-schema";

export const createTalentAction = adminFormAction(
  "createTalentAction",
  createTalentSchema,
  async (
    { supabaseClient },
    { name, reading, youtube_channel_id: channelInput }
  ) => {
    // タレントを作る前に、チャンネルを解決し、登録済みでないことを確かめる
    const account =
      channelInput !== undefined
        ? await resolveAccount("youtube", {
            input: channelInput,
            supabaseClient,
          })
        : null;

    const { data: newTalent, error } = await supabaseClient
      .from("talents")
      .insert({
        name,
        reading,
      })
      .select("id, name")
      .single();

    if (error) {
      throw error;
    }

    if (account) {
      try {
        await linkAccount("youtube", {
          input: account,
          supabaseClient,
          talentId: newTalent.id,
        });
      } catch (linkError) {
        await deleteTalentSafely(newTalent.id);

        if (linkError instanceof ActionError) {
          throw linkError;
        }

        logger.error("youtube_channelsテーブルへの書き込みに失敗しました", {
          error: linkError,
          youtube_channel_id: account.remote.id,
        });

        throw new ActionError(
          "YouTubeチャンネルの登録に失敗しました。しばらくしてから再度お試しください。",
          { field: "youtube_channel_id" }
        );
      }
    }

    // Log audit entry
    await createAuditLog(supabaseClient, "CHANNEL_CREATE", newTalent.id, {
      entityName: newTalent.name,
    });

    revalidatePath("/talents");
    await revalidateTags([CACHE_TAGS.TALENTS, CACHE_TAGS.VIDEOS]);
  }
);

/**
 * チャンネルを結び付けられなかったタレントを削除し、作成をなかったことにする。
 * `talents` には管理者向けの DELETE のポリシーがないため、サービスロールのクライアントを使う。
 */
async function deleteTalentSafely(id: string): Promise<void> {
  const { error } = await getSupabaseAdminClient()
    .from("talents")
    .delete()
    .eq("id", id);

  if (error) {
    logger.error("作成したタレントの削除に失敗しました", { error, id });
  }
}

export const updateTalentAction = adminFormAction(
  "updateTalentAction",
  updateTalentSchema,
  async ({ supabaseClient }, validatedData) => {
    // Update talents table (name, reading and theme_color)
    const { data: talent, error } = await supabaseClient
      .from("talents")
      .update({
        name: validatedData.name,
        reading: validatedData.reading,
        theme_color: validatedData.theme_color,
      })
      .eq("id", validatedData.id)
      .is("deleted_at", null)
      .select("name")
      .single();

    if (error) {
      // No row matched: the talent doesn't exist or is deleted
      if (isNotFoundError(error)) {
        logger.warn("更新対象のタレントが見つかりませんでした", {
          id: validatedData.id,
        });

        throw new ActionError(
          "指定されたタレントが見つかりません。既に削除されているか、存在しないIDが指定されています。"
        );
      }

      throw error;
    }

    // Note: Channel management is read-only for now when multiple channels exist
    // Future enhancement: Add UI for managing multiple channels individually

    // Log audit entry
    await createAuditLog(supabaseClient, "CHANNEL_UPDATE", validatedData.id, {
      entityName: talent.name,
    });

    revalidatePath("/talents");
    await revalidateTags([CACHE_TAGS.TALENTS, CACHE_TAGS.VIDEOS]);
  },
  // `id` は隠しフィールドで、画面に対応する入力欄がない
  { hiddenFields: ["id"] }
);

interface TalentLifecycleTransition {
  /** 監査ログに記録するアクション */
  auditAction: AuditAction;
  /** ログやエラーメッセージに使う操作名（例: 削除） */
  label: string;
  /** 対象が見つからなかったときに想定される理由 */
  notFoundReason: string;
  /** 遷移前にタレントが満たしているべき状態 */
  from: {
    deleted: boolean;
    status?: Tables<"talents">["status"];
  };
  /** 遷移後の値（`updated_at` はトリガーが付ける） */
  values: (
    now: string
  ) => Pick<TablesUpdate<"talents">, "deleted_at" | "status">;
}

const TALENT_LIFECYCLE_TRANSITIONS = {
  activate: {
    auditAction: "CHANNEL_ACTIVATE",
    from: { deleted: false, status: "retired" },
    label: "アクティブ化",
    notFoundReason: "既にアクティブ・削除されている",
    values: () => ({ status: "active" }),
  },
  delete: {
    auditAction: "CHANNEL_DELETE",
    from: { deleted: false },
    label: "削除",
    notFoundReason: "既に削除されている",
    values: (now) => ({ deleted_at: now }),
  },
  restore: {
    auditAction: "CHANNEL_RESTORE",
    from: { deleted: true },
    label: "復活",
    notFoundReason: "既に復活している",
    values: () => ({ deleted_at: null }),
  },
  retire: {
    auditAction: "CHANNEL_RETIRE",
    from: { deleted: false, status: "active" },
    label: "引退",
    notFoundReason: "既に引退・削除されている",
    values: () => ({ status: "retired" }),
  },
} as const satisfies Record<string, TalentLifecycleTransition>;

/**
 * タレントの削除・復活・引退・アクティブ化に共通する処理。
 * 遷移前の状態を条件に含めて更新し、監査ログの記録とキャッシュの再検証を行う。
 */
async function transitionTalentLifecycle(
  { supabaseClient }: AuthenticatedContext,
  talentId: string,
  transition: TalentLifecycleTransition
): Promise<ActionResult> {
  const id = parseActionInput(talentIdSchema, talentId);
  const now = toDBString(Temporal.Now.instant());

  let query = supabaseClient
    .from("talents")
    .update(transition.values(now))
    .eq("id", id);

  if (transition.from.status) {
    query = query.eq("status", transition.from.status);
  }

  query = transition.from.deleted
    ? query.not("deleted_at", "is", null)
    : query.is("deleted_at", null);

  const { data: talent, error } = await query.select("name").single();

  if (error) {
    // 条件に一致する行がない（存在しない、または既に遷移済み）
    if (isNotFoundError(error)) {
      logger.warn(`${transition.label}対象のタレントが見つかりませんでした`, {
        id,
      });

      throw new ActionError(
        `指定されたタレントが見つかりません。${transition.notFoundReason}か、存在しないIDが指定されています。`
      );
    }

    throw error;
  }

  await createAuditLog(supabaseClient, transition.auditAction, id, {
    entityName: talent.name,
  });

  revalidatePath("/talents");
  revalidatePath(`/talents/${id}`);
  await revalidateTags([CACHE_TAGS.TALENTS, CACHE_TAGS.VIDEOS]);

  return { success: true };
}

export const deleteTalentAction = adminAction(
  "deleteTalentAction",
  (context, id: string) =>
    transitionTalentLifecycle(context, id, TALENT_LIFECYCLE_TRANSITIONS.delete)
);

export const restoreTalentAction = adminAction(
  "restoreTalentAction",
  (context, id: string) =>
    transitionTalentLifecycle(context, id, TALENT_LIFECYCLE_TRANSITIONS.restore)
);

export const retireTalentAction = adminAction(
  "retireTalentAction",
  (context, id: string) =>
    transitionTalentLifecycle(context, id, TALENT_LIFECYCLE_TRANSITIONS.retire)
);

export const activateTalentAction = adminAction(
  "activateTalentAction",
  (context, id: string) =>
    transitionTalentLifecycle(
      context,
      id,
      TALENT_LIFECYCLE_TRANSITIONS.activate
    )
);
