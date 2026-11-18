import {
  type BackfillProvider,
  type BackfillRunJobStatus,
  BackfillRuns,
} from "@shinju-date/video-backfill";
import { cacheLife } from "next/cache";

import { getRedisClient } from "@/lib/redis";
import {
  createSupabaseServerClient,
  type TypedSupabaseClient,
} from "@/lib/supabase";

import { type BackfillAccount, getBackfillAccounts } from "./backfill-accounts";

/** Progress of the backfill of one account in a check of all talents. */
export interface VideoBackfillRunAccount {
  accountId: string;
  /** Whether the job is queued or being read. */
  active: boolean;
  /** Videos saved since the check queued the job. */
  added: number;
  error: string | null;
  /** Account name, or `null` when the account no longer exists. */
  name: string | null;
  provider: BackfillProvider;
  status: BackfillRunJobStatus;
  talentId: string;
  /** Talent name, or `null` when the talent was deleted. */
  talentName: string | null;
  updatedAt: string | null;
}

/** The latest check of all talents for videos that are not saved. */
export interface VideoBackfillRun {
  accounts: VideoBackfillRunAccount[];
  /** Whether any account is queued or being read. */
  active: boolean;
  /** Videos saved by the check, across all accounts. */
  added: number;
  counts: Record<BackfillRunJobStatus, number>;
  /** Accounts that could not be queued because of an error. */
  failed: number;
  id: string;
  requestedAt: string;
  /** Accounts left out because they were being backfilled already. */
  skipped: number;
}

/** Accounts of active talents, the targets of a check. */
export interface VideoBackfillTargets {
  twitch: number;
  youtube: number;
}

/** The targets of a check, with the progress of the latest one. */
export interface VideoBackfillRunState {
  /** `null` when there was no check (or it was long ago). */
  run: VideoBackfillRun | null;
  success: true;
  targets: VideoBackfillTargets;
}

export function countTargets(
  targets: readonly BackfillAccount[]
): VideoBackfillTargets {
  return {
    twitch: targets.filter((account) => account.provider === "twitch").length,
    youtube: targets.filter((account) => account.provider === "youtube").length,
  };
}

/**
 * 全タレントの取得漏れチェックの対象数と、最新のチェックの進捗を読む。
 * 進捗の判定に今の時刻（`Temporal.Now`）を使うので、Server Component からは
 * キャッシュする `getVideoBackfillRun` を通して呼ぶ（Cache Components の
 * プリレンダリングでは、キャッシュの外で時刻を読めない）
 */
export async function readVideoBackfillRun(
  supabaseClient: TypedSupabaseClient
): Promise<VideoBackfillRunState> {
  const [{ all, targets }, progress] = await Promise.all([
    getBackfillAccounts(supabaseClient),
    new BackfillRuns(getRedisClient()).getLatest(),
  ]);

  return {
    run: progress && {
      accounts: progress.jobs.map((job) => {
        const account = all.get(job.id);

        return {
          accountId: job.accountId,
          active: job.active,
          added: job.added,
          error: job.error,
          name: account?.name ?? null,
          provider: job.provider,
          status: job.status,
          talentId: job.talentId,
          talentName: account?.talentName ?? null,
          updatedAt: job.updatedAt,
        };
      }),
      active: progress.active,
      added: progress.added,
      counts: progress.counts,
      failed: progress.run.failed,
      id: progress.run.id,
      requestedAt: progress.run.requestedAt,
      skipped: progress.run.skipped,
    },
    success: true,
    targets: countTargets(targets),
  };
}

/**
 * 全タレントの取得漏れチェックの対象数と、最新のチェックの進捗を返す。
 * 進捗は刻々と変わるので、`seconds` でキャッシュする
 */
export async function getVideoBackfillRun(): Promise<VideoBackfillRunState> {
  "use cache: private";

  cacheLife("seconds");

  const supabaseClient = await createSupabaseServerClient();

  return readVideoBackfillRun(supabaseClient);
}
