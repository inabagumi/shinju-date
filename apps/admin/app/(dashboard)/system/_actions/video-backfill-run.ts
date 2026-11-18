"use server";

import { logger } from "@shinju-date/logger";
import { BackfillRuns } from "@shinju-date/video-backfill";

import { ActionError, type ActionResult, adminAction } from "@/lib/action";
import { createAuditLog } from "@/lib/audit-log";
import { getRedisClient } from "@/lib/redis";

import { getBackfillAccounts } from "../_lib/backfill-accounts";
import {
  countTargets,
  readVideoBackfillRun,
  type VideoBackfillRunState,
} from "../_lib/get-video-backfill-run";

/** 取得漏れチェックをキューに追加できたときに、画面に知らせること */
interface VideoBackfillRunRequestSummary {
  /** 成功のトーストに出す文 */
  message: string;
}

/**
 * 全 active タレントの過去動画の取り込み（取得漏れチェック）をキューに追加する。
 *
 * ## 仕様
 * - active なタレントに紐づく全アカウント（YouTube チャンネル / Twitch ユーザー）ごとに 1 ジョブを追加し、
 *   それらを 1 回のチェックとしてまとめる
 * - 取り込みそのものはバッチの `/videos/backfill` が非同期に行う。ここでは API を呼ばない
 * - 前回のチェックが実行中のとき、または同時に別の依頼を処理しているときは追加しない
 * - タレント詳細から依頼されて待機中・処理中のアカウントは二重に追加しない
 * - 失敗・中断したジョブは続きから、完了したジョブは最新の動画から読み直す
 * - 1 件以上追加したら監査ログ（`VIDEO_BACKFILL`）に依頼者を残す
 * - 一部のアカウントだけを追加できなかったときは、成功として返し、`warnings` で知らせる
 */
export const requestVideoBackfillRunAction = adminAction(
  "requestVideoBackfillRunAction",
  async ({
    supabaseClient,
    user,
  }): Promise<ActionResult<VideoBackfillRunRequestSummary>> => {
    const { targets } = await getBackfillAccounts(supabaseClient);

    if (targets.length === 0) {
      throw new ActionError(
        "active なタレントに紐づくアカウントはありません。"
      );
    }

    const result = await new BackfillRuns(getRedisClient()).start(targets, {
      onError: (request, error) => {
        logger.error("過去動画の取り込みをキューに追加できませんでした", {
          accountId: request.accountId,
          error,
          provider: request.provider,
          talentId: request.talentId,
        });
      },
      requestedBy: user.id,
    });

    switch (result.status) {
      case "active":
        throw new ActionError("全タレントの取得漏れチェックは既に実行中です。");
      case "busy":
        throw new ActionError(
          "別の取得漏れチェックの依頼を処理しています。しばらくしてから再度お試しください。"
        );
      case "empty":
        throw new ActionError(
          result.failed > 0
            ? "取得漏れチェックをキューに追加できませんでした。"
            : "すべてのアカウントで過去動画の取り込みが実行中です。"
        );
    }

    const { failed, run, skipped } = result;

    await createAuditLog(supabaseClient, "VIDEO_BACKFILL", run.id, {
      accounts: run.jobs.length,
      entityName: `全タレントの取得漏れチェック（${run.jobs.length}件）`,
      failed,
      scope: "all",
      skipped,
      targets: countTargets(targets),
    });

    const message = `全タレントの取得漏れチェックを${run.jobs.length}件キューに追加しました${
      skipped > 0 ? `（実行中の${skipped}件は除く）` : ""
    }。`;

    return {
      data: { message },
      success: true,
      ...(failed > 0
        ? {
            warnings: [
              `取得漏れチェックのうち、${failed}件はキューに追加できませんでした。`,
            ],
          }
        : {}),
    };
  }
);

/**
 * 全タレントの取得漏れチェックの対象数と、最新のチェックの進捗を返す。定期的な再取得に使う。
 */
export const getVideoBackfillRunAction = adminAction(
  "getVideoBackfillRunAction",
  async ({ supabaseClient }): Promise<ActionResult<VideoBackfillRunState>> => ({
    data: await readVideoBackfillRun(supabaseClient),
    success: true,
  })
);
