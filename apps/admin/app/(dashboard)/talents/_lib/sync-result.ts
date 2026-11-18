import type { Enums } from "@shinju-date/database";

import { ACTION_FAILED_ERROR_MESSAGE } from "@/lib/action";
import type { ActionResult } from "@/lib/action";

type Platform = Enums<"platform_type">;

/** タレントの同期が成功したときに、画面に知らせること */
export interface SyncSummary {
  /** 成功のトーストに出す文。省くと、呼ぶ側が `unchanged` から決める */
  message?: string;
  /** どのアカウントも更新されなかった */
  unchanged: boolean;
}

/** タレントの同期のアクションの戻り値 */
export type SyncResult = ActionResult<SyncSummary>;

/**
 * 1つのプラットフォームの同期の結果（`no_accounts`: そのプラットフォームのアカウントがない）。
 * `failed` の `error` は画面に見せてよい文で、予期しない失敗のときは省く。
 */
export type PlatformSyncOutcome =
  | { status: "no_accounts" | "unchanged" | "updated" }
  | { error?: string; status: "failed" };

const PLATFORMS = {
  twitch: {
    account: "ユーザー",
    label: "Twitch",
    /** 1つのプラットフォームだけを同期したときの「変更なし」 */
    unchanged: "Twitchユーザー情報は既に最新です。",
  },
  youtube: {
    account: "チャンネル",
    label: "YouTube",
    unchanged: "チャンネル情報は既に最新です。",
  },
} as const satisfies Record<Platform, Record<string, string>>;

/** どのアカウントも、プラットフォームで見つからなかった（同期できなかった）ときの文 */
export const accountsNotFoundError = (platform: Platform): string => {
  const { account, label } = PLATFORMS[platform];

  return `${label}で${account}が見つかりませんでした。${account}IDが正しいか確認してください。`;
};

/** 1つのプラットフォームだけを同期したときの結果を、画面の文にする。 */
export const toSyncResult = (
  platform: Platform,
  outcome: PlatformSyncOutcome
): SyncResult => {
  const { account, label, unchanged } = PLATFORMS[platform];

  switch (outcome.status) {
    case "no_accounts": {
      return {
        error: `このタレントに紐づく${label}${account}はありません。`,
        success: false,
      };
    }
    case "failed": {
      return {
        error: outcome.error ?? ACTION_FAILED_ERROR_MESSAGE,
        success: false,
      };
    }
    case "unchanged": {
      return { data: { message: unchanged, unchanged: true }, success: true };
    }
    case "updated": {
      return { data: { unchanged: false }, success: true };
    }
  }
};

/**
 * まとめて同期したときの結果を、プラットフォームごとに1行の文にする。
 *
 * - アカウントのないプラットフォームは書かない
 * - 同期できたプラットフォームの文は `data.message` に、失敗したプラットフォームの
 *   文は `warnings` に入れる
 * - すべてのプラットフォームが失敗したら `success: false` とし、`error` に文を入れる
 * - `unchanged` は、どのプラットフォームも更新されなかったときに `true`
 */
export const toSyncSummary = (
  outcomes: readonly (readonly [Platform, PlatformSyncOutcome])[]
): SyncResult => {
  const succeeded: string[] = [];
  const failed: string[] = [];

  for (const [platform, outcome] of outcomes) {
    const { account, label } = PLATFORMS[platform];

    switch (outcome.status) {
      case "no_accounts": {
        break;
      }
      case "failed": {
        failed.push(`${label}: 同期に失敗しました。${outcome.error ?? ""}`);
        break;
      }
      case "unchanged": {
        succeeded.push(`${label}: ${account}情報は既に最新です。`);
        break;
      }
      case "updated": {
        succeeded.push(`${label}: ${account}情報を同期しました。`);
        break;
      }
    }
  }

  if (succeeded.length === 0 && failed.length === 0) {
    return {
      error:
        "このタレントに紐づくYouTubeチャンネル・Twitchユーザーはありません。",
      success: false,
    };
  }

  if (succeeded.length === 0) {
    return { error: failed.join("\n"), success: false };
  }

  const unchanged = outcomes.every(([, { status }]) => status !== "updated");

  return {
    data: { message: succeeded.join("\n"), unchanged },
    success: true,
    ...(failed.length > 0 ? { warnings: failed } : {}),
  };
};
