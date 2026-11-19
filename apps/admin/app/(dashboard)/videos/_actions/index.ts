"use server";

import { CACHE_TAGS } from "@shinju-date/constants";
import type { Tables } from "@shinju-date/database";
import { logger } from "@shinju-date/logger";
import { toDBString } from "@shinju-date/temporal-fns";
import { revalidateTags } from "@shinju-date/web-cache";
import { revalidatePath } from "next/cache";

import { ActionError, adminAction, parseActionInput } from "@/lib/action";
import type { ActionResult } from "@/lib/action";
import { createAuditLogs } from "@/lib/audit-log";
import type { AuthenticatedContext } from "@/lib/auth";

import { videoIdsSchema } from "../_lib/schema";

/** まとめて操作する動画の、読み取った行 */
type BulkVideo = Pick<Tables<"videos">, "id" | "title" | "visible">;

/** 更新された動画（監査ログと再検証に使う） */
type UpdatedVideo = Pick<Tables<"videos">, "id" | "title">;

/** 動画をまとめて操作したときの戻り値 */
export interface BulkVideoActionData {
  /** 更新された動画の件数 */
  updatedCount: number;
  /**
   * 選ばれた動画のうち、すでに目的の状態だったので更新しなかった動画の件数
   * （削除なら削除済みの動画、復元なら削除されていない動画）
   */
  skippedCount: number;
}

interface BulkVideoUpdateContext extends AuthenticatedContext {
  /** 選ばれた動画のうち、見つかったもの */
  videos: BulkVideo[];
  /** 削除日時（`deleted_at`）に使う、今の日時（`toDBString` 済み） */
  now: string;
}

/** `update` の戻り値 */
interface BulkVideoUpdateResult {
  /**
   * 実際に更新された動画。一部だけ更新できたときは、更新できたぶんだけを
   * 返す（監査ログと再検証は、この動画だけに行う）
   */
  updatedVideos: UpdatedVideo[];
  /**
   * すでに目的の状態だったので、更新しなかった動画の件数。失敗には数えない
   * （省略時は 0）
   */
  skippedCount?: number;
}

interface BulkVideoActionOptions {
  /** 選ばれた動画の ID。ブラウザから届いた値なので、`videoIdsSchema` で検証する */
  ids: string[];
  /** 動画を更新し、実際に更新された動画を返す */
  update: (context: BulkVideoUpdateContext) => Promise<BulkVideoUpdateResult>;
  /** 監査ログに記録するアクション（詳細には動画のタイトルを記録する） */
  auditAction: "VIDEO_DELETE" | "VIDEO_RESTORE" | "VIDEO_VISIBILITY_TOGGLE";
}

/**
 * 動画の表示切り替え・削除・復元に共通する処理。
 * 選ばれた動画を読み、`update` で更新し、更新された動画の監査ログを書き、再検証する。
 * 一部だけ更新できたときは、更新できたぶんの監査ログと再検証を行ってから、件数を知らせる。
 */
const runBulkVideoAction = async (
  context: AuthenticatedContext,
  { auditAction, ids, update }: BulkVideoActionOptions
): Promise<ActionResult<BulkVideoActionData>> => {
  const { supabaseClient } = context;
  const videoIds = parseActionInput(videoIdsSchema, ids);

  const { data: videos, error: fetchError } = await supabaseClient
    .from("videos")
    .select("id, title, visible")
    .in("id", videoIds);

  if (fetchError) {
    throw fetchError;
  }

  if (!videos || videos.length === 0) {
    throw new ActionError("動画が見つかりませんでした。");
  }

  const { skippedCount = 0, updatedVideos } = await update({
    ...context,
    now: toDBString(Temporal.Now.instant()),
    videos,
  });

  if (updatedVideos.length > 0) {
    await createAuditLogs(
      supabaseClient,
      updatedVideos.map((video) => ({
        action: auditAction,
        details: { entityName: video.title },
        targetRecordId: video.id,
      }))
    );

    revalidatePath("/videos");

    for (const video of updatedVideos) {
      revalidatePath(`/videos/${video.id}`);
    }

    await revalidateTags([CACHE_TAGS.VIDEOS]);
  }

  const failedCount = videos.length - updatedVideos.length - skippedCount;

  if (failedCount > 0) {
    throw new ActionError(
      `${updatedVideos.length} 件を更新し、${failedCount} 件は失敗しました。`
    );
  }

  return {
    data: { skippedCount, updatedCount: updatedVideos.length },
    success: true,
  };
};

/**
 * 関数（`soft_delete_videos` / `restore_videos`）が返した、実際に更新された
 * 動画の ID から、更新された動画と、更新しなかった動画の件数を作る。
 * 関数は、すでに目的の状態の動画を更新しないので、返されなかった動画は
 * 失敗ではなく、更新しなかったものとして数える
 */
const toBulkVideoUpdateResult = (
  videos: readonly BulkVideo[],
  updatedIds: readonly string[]
): BulkVideoUpdateResult => {
  const ids = new Set(updatedIds);
  const updatedVideos = videos.filter((video) => ids.has(video.id));

  return {
    skippedCount: videos.length - updatedVideos.length,
    updatedVideos,
  };
};

export const toggleVisibilityAction = adminAction(
  "toggleVisibilityAction",
  (context, ids: string[]) =>
    runBulkVideoAction(context, {
      auditAction: "VIDEO_VISIBILITY_TOGGLE",
      ids,
      update: async ({ supabaseClient, videos }) => {
        // 切り替え先ごとにまとめ、表示にする動画と非表示にする動画をそれぞれ1回で更新する
        const groups = [
          {
            ids: videos.filter((video) => !video.visible).map(({ id }) => id),
            visible: true,
          },
          {
            ids: videos.filter((video) => video.visible).map(({ id }) => id),
            visible: false,
          },
        ].filter((group) => group.ids.length > 0);

        const results = await Promise.all(
          groups.map((group) =>
            supabaseClient
              .from("videos")
              .update({ visible: group.visible })
              .in("id", group.ids)
              // 読み取った後にほかの操作で切り替わった動画は更新しない
              .eq("visible", !group.visible)
              .select("id, title")
          )
        );

        for (const [index, { error }] of results.entries()) {
          if (error) {
            logger.error("動画の表示切替に失敗しました", {
              error,
              ids: groups[index]?.ids.join(","),
            });
          }
        }

        const updatedVideos = results.flatMap(({ data }) => data ?? []);

        if (updatedVideos.length === 0) {
          throw new ActionError("動画の表示状態を更新できませんでした。");
        }

        return { updatedVideos };
      },
    })
);

export const softDeleteAction = adminAction(
  "softDeleteAction",
  (context, ids: string[]) =>
    runBulkVideoAction(context, {
      auditAction: "VIDEO_DELETE",
      ids,
      update: async ({ now, supabaseClient, videos }) => {
        // 動画とサムネイルを1つのトランザクションで削除する。すでに別の理由
        // （unavailable、talent_deleted）で削除されている動画は、理由と日時を
        // 変えない（withdrawn に変わると、タレントの復活で戻らなくなる）
        const { data: deletedIds, error } = await supabaseClient.rpc(
          "soft_delete_videos",
          {
            p_deleted_at: now,
            p_reason: "withdrawn",
            p_video_ids: videos.map(({ id }) => id),
          }
        );

        if (error) {
          throw error;
        }

        return toBulkVideoUpdateResult(videos, deletedIds);
      },
    })
);

export const restoreAction = adminAction(
  "restoreAction",
  (context, ids: string[]) =>
    runBulkVideoAction(context, {
      auditAction: "VIDEO_RESTORE",
      ids,
      update: async ({ supabaseClient, videos }) => {
        // 管理者は、理由を問わずに復元できる。動画とサムネイルを1つの
        // トランザクションで復元する
        const { data: restoredIds, error } = await supabaseClient.rpc(
          "restore_videos",
          { p_video_ids: videos.map(({ id }) => id) }
        );

        if (error) {
          throw error;
        }

        return toBulkVideoUpdateResult(videos, restoredIds);
      },
    })
);
